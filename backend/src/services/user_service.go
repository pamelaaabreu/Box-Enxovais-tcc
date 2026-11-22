package services

import (
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"errors"
	"github.com/lib/pq"
	"golang.org/x/crypto/bcrypt"
)

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
