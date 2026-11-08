package services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"time"
)

type PasswordResetTokenStatus uint8

const (
	PasswordResetTokenInvalid PasswordResetTokenStatus = iota
	PasswordResetTokenExpired
	PasswordResetTokenValid
)

type PasswordResetTokenData struct {
	Email     string
	ExpiresAt time.Time
}

var passwordResetTokens = make(map[[32]byte]PasswordResetTokenData)

// Called only under recoveryMu after a successful code verification. These
// opaque credentials are recognized exclusively by password recovery endpoints.
func generatePasswordResetToken(email string) (string, error) {
	bytes := make([]byte, 32)
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}
	token := base64.RawURLEncoding.EncodeToString(bytes)
	invalidateResetTokens(email)
	passwordResetTokens[sha256.Sum256([]byte(token))] = PasswordResetTokenData{
		Email: email, ExpiresAt: time.Now().Add(10 * time.Minute),
	}
	return token, nil
}

func invalidateResetTokens(email string) {
	for key, data := range passwordResetTokens {
		if data.Email == email {
			delete(passwordResetTokens, key)
		}
	}
}

func checkPasswordResetToken(token string) (string, PasswordResetTokenStatus) {
	data, exists := passwordResetTokens[sha256.Sum256([]byte(token))]
	if !exists || pendingCodeEmails[data.Email] {
		return "", PasswordResetTokenInvalid
	}
	if !data.ExpiresAt.After(time.Now()) {
		return "", PasswordResetTokenExpired
	}
	return data.Email, PasswordResetTokenValid
}

func CheckPasswordResetToken(token string) (string, PasswordResetTokenStatus) {
	recoveryMu.Lock()
	defer recoveryMu.Unlock()
	return checkPasswordResetToken(token)
}

// Serialize redemption with verification/resend. Consume only after the database
// confirms the update, so a transient DB failure can be retried safely.
func CompletePasswordReset(token string, update func(string) error) (PasswordResetTokenStatus, error) {
	recoveryMu.Lock()
	defer recoveryMu.Unlock()
	email, status := checkPasswordResetToken(token)
	if status != PasswordResetTokenValid {
		return status, nil
	}
	if err := update(email); err != nil {
		return status, err
	}
	invalidateResetTokens(email)
	delete(verificationCodes, email)
	return PasswordResetTokenValid, nil
}
