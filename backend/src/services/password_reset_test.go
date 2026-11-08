package services

import (
	"crypto/sha256"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"
)

func issue(t *testing.T, email string) string {
	t.Helper()
	var code string
	if err := SendPasswordResetCode(email, func(value string) error { code = value; return nil }); err != nil {
		t.Fatal(err)
	}
	return code
}
func TestRecoveryLifecycle(t *testing.T) {
	email := "lifecycle@example.com"
	recoveryMu.Lock()
	delete(verificationCodes, email)
	recoveryMu.Unlock()
	code := issue(t, email)
	if len(code) != 8 {
		t.Fatal("code length")
	}
	if _, status, _ := ExchangeVerificationCode(email, "WRONG123"); status != VerificationCodeInvalid {
		t.Fatal("invalid code accepted")
	}
	token, status, err := ExchangeVerificationCode(" LIFECYCLE@example.com ", code)
	if err != nil || status != VerificationCodeValid || token == "" {
		t.Fatal("verification failed")
	}
	if _, status, _ := ExchangeVerificationCode(email, code); status != VerificationCodeInvalid {
		t.Fatal("code reused")
	}
	dbError := errors.New("database unavailable")
	if _, err := CompletePasswordReset(token, func(string) error { return dbError }); !errors.Is(err, dbError) {
		t.Fatal("lost DB error")
	}
	if _, status := CheckPasswordResetToken(token); status != PasswordResetTokenValid {
		t.Fatal("failed update consumed token")
	}
	status2, err := CompletePasswordReset(token, func(got string) error {
		if got != email {
			t.Fatal(got)
		}
		return nil
	})
	if err != nil || status2 != PasswordResetTokenValid {
		t.Fatal("reset failed")
	}
	if _, status := CheckPasswordResetToken(token); status != PasswordResetTokenInvalid {
		t.Fatal("token reused")
	}
}

func TestMissingRecoveryEntries(t *testing.T) {
	if _, status, err := ExchangeVerificationCode("missing-recovery@example.com", "AB12CD34"); err != nil || status != VerificationCodeInvalid {
		t.Fatal("missing code must be rejected")
	}
	const token = "missing-reset-token"
	if _, status := CheckPasswordResetToken(token); status != PasswordResetTokenInvalid {
		t.Fatal("missing token must be rejected")
	}
	status, err := CompletePasswordReset(token, func(string) error {
		t.Fatal("missing token must not update a password")
		return nil
	})
	if err != nil || status != PasswordResetTokenInvalid {
		t.Fatal("missing token redemption must be rejected")
	}
}

func TestConcurrentCodeDelivery(t *testing.T) {
	const email = "concurrent-delivery@example.com"
	started := make(chan struct{})
	release := make(chan struct{})
	finished := make(chan error, 1)
	var once sync.Once
	unblock := func() { once.Do(func() { close(release) }) }
	t.Cleanup(unblock)
	go func() {
		finished <- SendPasswordResetCode(email, func(string) error {
			close(started)
			<-release
			return nil
		})
	}()
	<-started
	var wg sync.WaitGroup
	var unexpected atomic.Int32
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			err := SendPasswordResetCode(email, func(string) error {
				unexpected.Add(1)
				return nil
			})
			if !errors.Is(err, ErrResetCodeCooldown) {
				unexpected.Add(1)
			}
		}()
	}
	wg.Wait()
	unblock()
	if err := <-finished; err != nil {
		t.Fatal(err)
	}
	if unexpected.Load() != 0 {
		t.Fatal("concurrent requests must not send while delivery is pending")
	}
	recoveryMu.Lock()
	pending := pendingCodeEmails[email]
	_, exists := verificationCodes[email]
	recoveryMu.Unlock()
	if pending || !exists {
		t.Fatal("successful delivery must release the reservation and store the code")
	}
}
func TestExpiryResendAndAttempts(t *testing.T) {
	email := "resend@example.com"
	old := issue(t, email)
	if err := SendPasswordResetCode(email, func(string) error { t.Fatal("sent during cooldown"); return nil }); !errors.Is(err, ErrResetCodeCooldown) {
		t.Fatal("missing cooldown")
	}
	recoveryMu.Lock()
	data := verificationCodes[email]
	data.ExpiresAt = time.Now().Add(-time.Second)
	data.ResendAt = time.Time{}
	verificationCodes[email] = data
	recoveryMu.Unlock()
	if _, status, _ := ExchangeVerificationCode(email, old); status != VerificationCodeExpired {
		t.Fatal("expiry")
	}
	fresh := issue(t, email)
	if _, status, _ := ExchangeVerificationCode(email, old); status != VerificationCodeInvalid {
		t.Fatal("old code accepted")
	}
	token, _, _ := ExchangeVerificationCode(email, fresh)
	recoveryMu.Lock()
	data = verificationCodes[email]
	data.ResendAt = time.Time{}
	verificationCodes[email] = data
	recoveryMu.Unlock()
	fresh = issue(t, email)
	if _, status := CheckPasswordResetToken(token); status != PasswordResetTokenInvalid {
		t.Fatal("resend did not revoke token")
	}
	for i := 0; i < 5; i++ {
		ExchangeVerificationCode(email, "INVALID1")
	}
	if _, status, _ := ExchangeVerificationCode(email, fresh); status != VerificationCodeInvalid {
		t.Fatal("attempt limit")
	}
	email = "tokenexpiry@example.com"
	code := issue(t, email)
	token, _, _ = ExchangeVerificationCode(email, code)
	recoveryMu.Lock()
	key := sha256.Sum256([]byte(token))
	td := passwordResetTokens[key]
	td.ExpiresAt = time.Now().Add(-time.Second)
	passwordResetTokens[key] = td
	recoveryMu.Unlock()
	status, _ := CompletePasswordReset(token, func(string) error { t.Fatal("expired update"); return nil })
	if status != PasswordResetTokenExpired {
		t.Fatal("token expiry")
	}
}
func TestConcurrentRecovery(t *testing.T) {
	email := "concurrent@example.com"
	code := issue(t, email)
	var successes atomic.Int32
	var wg sync.WaitGroup
	var token string
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			value, status, _ := ExchangeVerificationCode(email, code)
			if status == VerificationCodeValid {
				successes.Add(1)
				token = value
			}
		}()
	}
	wg.Wait()
	if successes.Load() != 1 {
		t.Fatal("multiple tokens issued")
	}
	successes.Store(0)
	for i := 0; i < 20; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			CompletePasswordReset(token, func(string) error { successes.Add(1); return nil })
		}()
	}
	wg.Wait()
	if successes.Load() != 1 {
		t.Fatal("multiple password updates")
	}
}
func TestFailedDeliveryPreservesCode(t *testing.T) {
	email := "delivery@example.com"
	code := issue(t, email)
	recoveryMu.Lock()
	data := verificationCodes[email]
	data.ResendAt = time.Time{}
	verificationCodes[email] = data
	recoveryMu.Unlock()
	err := SendPasswordResetCode(email, func(string) error { return errors.New("smtp") })
	if err == nil {
		t.Fatal("delivery error lost")
	}
	if _, status, _ := ExchangeVerificationCode(email, code); status != VerificationCodeValid {
		t.Fatal("old code lost")
	}
}
