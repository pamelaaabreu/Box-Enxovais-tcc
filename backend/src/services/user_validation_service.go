package services

import (
	"net/mail"
	"strings"
	"unicode/utf16"

	"backend/src/models"
)

const minPasswordLength = 8
const maxPasswordBytes = 72

func normalizeEmail(email string) string { return strings.ToLower(strings.TrimSpace(email)) }

// Normaliza o nome e o e-mail.
func normalizeCreateUserData(user *models.CreateUserRequest) {
	user.Name = strings.TrimSpace(user.Name)
	user.Email = normalizeEmail(user.Email)
}

// Valida os dados obrigatórios do cadastro.
func validateCreateUser(user models.CreateUserRequest) string {
	if user.Name == "" {
		return "Nome é obrigatório"
	}

	if !isValidFullName(user.Name) {
		return "Informe seu nome e sobrenome"
	}

	if user.Email == "" {
		return "Email é obrigatório"
	}

	if !isValidEmail(user.Email) {
		return "Email inválido"
	}

	if user.Password == "" {
		return "Senha é obrigatória"
	}

	// Respeita o limite de bytes suportado pelo bcrypt.
	if len(user.Password) > maxPasswordBytes {
		return "A senha deve ter no máximo 72 bytes"
	}

	if !isStrongPassword(user.Password) {
		return "A senha deve ter pelo menos 8 caracteres, incluindo letra maiúscula, minúscula, número e símbolo especial"
	}

	if !user.Terms {
		return "É necessário aceitar os termos de uso"
	}

	// String vazia significa que não existem erros.
	return ""
}

// Valida o formato do e-mail.
func isValidEmail(email string) bool {
	address, err := mail.ParseAddress(email)

	return err == nil && address.Address == email
}

// Exige pelo menos dois nomes,
// cada um contendo pelo menos dois caracteres.
func isValidFullName(name string) bool {
	parts := strings.Fields(name)

	if len(parts) < 2 {
		return false
	}

	for _, part := range parts {
		if len([]rune(part)) < 2 {
			return false
		}
	}

	return true
}

// Verifica os requisitos de complexidade da senha.
func isStrongPassword(password string) bool {
	if len(password) > maxPasswordBytes || len(utf16.Encode([]rune(password))) < minPasswordLength {
		return false
	}

	var hasUppercase, hasLowercase, hasNumber, hasSpecial bool

	for _, char := range password {
		switch {
		case char >= 'A' && char <= 'Z':
			hasUppercase = true

		case char >= 'a' && char <= 'z':
			hasLowercase = true

		case char >= '0' && char <= '9':
			hasNumber = true

		case strings.ContainsRune("?@#$%&", char):
			hasSpecial = true
		}
	}

	return hasUppercase &&
		hasLowercase &&
		hasNumber &&
		hasSpecial
}
