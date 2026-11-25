package services

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"time"
)

// Representa os possíveis estados do token.
type PasswordResetTokenStatus uint8

const (
	PasswordResetTokenInvalid PasswordResetTokenStatus = iota
	PasswordResetTokenExpired
	PasswordResetTokenValid
)

// Informações associadas ao token de recuperação.
type PasswordResetTokenData struct {
	Email     string
	ExpiresAt time.Time
}

// Utiliza o hash do token como chave do map.
var passwordResetTokens = make(map[[32]byte]PasswordResetTokenData)

// Gera um token após a validação do código de recuperação.
// Deve ser executada com recoveryMu bloqueado.
func generatePasswordResetToken(email string) (string, error) {
	bytes := make([]byte, 32)

	// Gera 32 bytes aleatórios criptograficamente seguros.
	if _, err := rand.Read(bytes); err != nil {
		return "", err
	}

	// Converte os bytes para uma string adequada ao transporte.
	token := base64.RawURLEncoding.EncodeToString(bytes)

	// Invalida tokens anteriores do mesmo usuário.
	invalidateResetTokens(email)

	// Armazena somente o hash do token.
	passwordResetTokens[sha256.Sum256([]byte(token))] = PasswordResetTokenData{
		Email:     email,
		ExpiresAt: time.Now().Add(resetTokenLifetime),
	}

	return token, nil
}

// Remove todos os tokens associados ao e-mail.
func invalidateResetTokens(email string) {
	for key, data := range passwordResetTokens {
		if data.Email == email {
			delete(passwordResetTokens, key)
		}
	}
}

// Consulta o token sem adquirir um novo bloqueio.
func checkPasswordResetToken(token string) (string, PasswordResetTokenStatus) {
	data, exists := passwordResetTokens[sha256.Sum256([]byte(token))]

	// Rejeita tokens inexistentes ou associados
	// a uma recuperação com envio em andamento.
	if !exists || pendingCodeEmails[data.Email] {
		return "", PasswordResetTokenInvalid
	}

	// Verifica a expiração.
	if !data.ExpiresAt.After(time.Now()) {
		return "", PasswordResetTokenExpired
	}

	return data.Email, PasswordResetTokenValid
}

// Disponibiliza uma consulta protegida pelo mutex.
func CheckPasswordResetToken(token string) (string, PasswordResetTokenStatus) {
	recoveryMu.Lock()
	defer recoveryMu.Unlock()

	return checkPasswordResetToken(token)
}

// Atualiza a senha e invalida os dados de recuperação.
func CompletePasswordReset(
	token string,
	update func(string) error,
) (PasswordResetTokenStatus, error) {

	recoveryMu.Lock()
	defer recoveryMu.Unlock()

	// Valida novamente o token.
	email, status := checkPasswordResetToken(token)

	if status != PasswordResetTokenValid {
		return status, nil
	}

	// Executa a atualização da senha no banco.
	if err := update(email); err != nil {
		return status, err
	}

	// Invalida os tokens somente após a atualização
	// bem-sucedida da senha.
	invalidateResetTokens(email)

	delete(verificationCodes, email)

	return PasswordResetTokenValid, nil
}
