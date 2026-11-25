package services

import (
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"errors"
	"math/big"
	"strings"
	"sync"
	"time"
)

// Recovery state is process-local. All transitions share one lock, including
// exchanging a code, resending and committing a password update.
const (
	resetCodeAttempts   = 5
	resetCodeLifetime   = 5 * time.Minute
	resetTokenLifetime  = 10 * time.Minute
	resetResendCooldown = 30 * time.Second
	resetCleanupGrace   = 10 * time.Minute
)

var recoveryMu sync.Mutex
var verificationCodes = make(map[string]verificationData)
var pendingCodeEmails = make(map[string]bool)
var ErrResetCodeCooldown = errors.New("aguarde antes de reenviar o código")

type VerificationCodeStatus uint8

const (
	VerificationCodeInvalid VerificationCodeStatus = iota
	VerificationCodeExpired
	VerificationCodeValid
)

type verificationData struct {
	Hash      [32]byte
	ExpiresAt time.Time
	ResendAt  time.Time
	Attempts  int
}

func GenerateVerificationCode() (string, error) {
	const alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
	code := make([]byte, 8)
	for index := range code {
		position, err := rand.Int(rand.Reader, big.NewInt(int64(len(alphabet))))
		if err != nil {
			return "", err
		}
		code[index] = alphabet[position.Int64()]
	}
	return string(code), nil
}

// Reserve the email while SMTP runs without holding the global lock. Failed
// delivery leaves the previous recovery intact; successful delivery replaces it.
func SendPasswordResetCode(email string, send func(string) error) error {
	email = normalizeVerificationEmail(email)
	recoveryMu.Lock()
	now := time.Now()
	for key, data := range verificationCodes {
		if now.After(data.ExpiresAt.Add(resetCleanupGrace)) {
			delete(verificationCodes, key)
		}
	}
	for key, data := range passwordResetTokens {
		if now.After(data.ExpiresAt.Add(resetCleanupGrace)) {
			delete(passwordResetTokens, key)
		}
	}
	data, exists := verificationCodes[email]
	if pendingCodeEmails[email] || (exists && now.Before(data.ResendAt)) {
		recoveryMu.Unlock()
		return ErrResetCodeCooldown
	}
	pendingCodeEmails[email] = true
	recoveryMu.Unlock()
	defer func() { recoveryMu.Lock(); delete(pendingCodeEmails, email); recoveryMu.Unlock() }()
	code, err := GenerateVerificationCode()
	if err != nil {
		return err
	}
	if err = send(code); err != nil {
		return err
	}
	recoveryMu.Lock()
	defer recoveryMu.Unlock()
	verificationCodes[email] = verificationData{
		Hash: sha256.Sum256([]byte(code)), ExpiresAt: time.Now().Add(resetCodeLifetime),
		ResendAt: time.Now().Add(resetResendCooldown),
	}
	invalidateResetTokens(email)
	return nil
}

// A code can authorize exactly one reset token, even with concurrent requests.
func ExchangeVerificationCode(email, code string) (string, VerificationCodeStatus, error) {
	recoveryMu.Lock()
	defer recoveryMu.Unlock()
	email = normalizeVerificationEmail(email)
	data, exists := verificationCodes[email]
	if !exists || pendingCodeEmails[email] {
		return "", VerificationCodeInvalid, nil
	}
	if !data.ExpiresAt.After(time.Now()) {
		return "", VerificationCodeExpired, nil
	}
	if data.Attempts >= resetCodeAttempts {
		return "", VerificationCodeInvalid, nil
	}
	hash := sha256.Sum256([]byte(strings.ToUpper(strings.TrimSpace(code))))
	if subtle.ConstantTimeCompare(hash[:], data.Hash[:]) != 1 {
		data.Attempts++
		verificationCodes[email] = data
		return "", VerificationCodeInvalid, nil
	}
	token, err := generatePasswordResetToken(email)
	if err != nil {
		return "", VerificationCodeInvalid, err
	}
	// Retain the resend deadline while preventing reuse of the verified code.
	data.Attempts = resetCodeAttempts
	verificationCodes[email] = data
	return token, VerificationCodeValid, nil
}

func normalizeVerificationEmail(email string) string {
	return normalizeEmail(email)
}

// Compartilhado com o cabeçalho HTTP, sem alterar a política de reenvio.
const ResetResendCooldown = resetResendCooldown
