package services

import (
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"errors"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
	"net/mail"
	"strings"
	"unicode/utf16"
)

const minPasswordLength = 8

type ValidationError string

func (err ValidationError) Error() string { return string(err) }

var ErrPasswordHash = errors.New("password hashing failed")
var ErrEmailDuplicated = errors.New("email_duplicado")
var ErrUserDuplicated = errors.New("dados_duplicados")

type UserService struct{ Store repositories.UserRepository }

func (service UserService) Create(ctx context.Context, user models.CreateUserRequest) error {
	normalizeCreateUserData(&user)
	if message := validateCreateUser(user); message != "" {
		return ValidationError(message)
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(user.Password), bcrypt.DefaultCost)
	if err != nil {
		return errors.Join(ErrPasswordHash, err)
	}
	return classifyCreateUserError(service.Store.Create(ctx, user, string(hash)))
}

func classifyCreateUserError(err error) error {
	var postgresError *pq.Error
	if errors.As(err, &postgresError) && postgresError.Code == "23505" {
		if postgresError.Constraint == "users_email_key" {
			return ErrEmailDuplicated
		}
		return ErrUserDuplicated
	}
	return err
}

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
