package services

import (
	"backend/src/models"
	"net/mail"
	"strings"
	"unicode/utf16"
)

const minPasswordLength = 8

func normalizeCreateUserData(user *models.CreateUserRequest) {
	user.Name = strings.TrimSpace(user.Name)
	user.Email = strings.ToLower(strings.TrimSpace(user.Email))
}

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

	if len(user.Password) > 72 {
		return "A senha deve ter no máximo 72 bytes"
	}

	if !isStrongPassword(user.Password) {
		return "A senha deve ter pelo menos 8 caracteres, incluindo letra maiúscula, minúscula, número e símbolo especial"
	}

	if !user.Terms {
		return "É necessário aceitar os termos de uso"
	}

	return ""
}

func isValidEmail(email string) bool {
	address, err := mail.ParseAddress(email)
	return err == nil && address.Address == email
}

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

func isStrongPassword(password string) bool {
	if len(utf16.Encode([]rune(password))) < minPasswordLength {
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

	return hasUppercase && hasLowercase && hasNumber && hasSpecial
}
