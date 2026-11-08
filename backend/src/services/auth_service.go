package services

import (
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"database/sql"
	"errors"
	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
	"net/mail"
	"strconv"
	"strings"
	"time"
	"unicode"
)

const (
	tokenDuration = 2 * time.Hour
	jwtIssuer     = "box-enxovais-api"
)

var ErrInvalidCredentials = errors.New("invalid credentials")
var ErrJWTConfiguration = errors.New("JWT configuration missing")
var ErrTokenSigning = errors.New("token signing failed")
var ErrUserNotFound = errors.New("user not found")
var ErrRecoveryLookup = errors.New("recovery user lookup failed")

type AuthService struct {
	Store     repositories.UserRepository
	JWTSecret string
}

func (service AuthService) Login(ctx context.Context, credentials models.Credentials) (models.LoginResponse, error) {
	email := strings.ToLower(strings.TrimSpace(credentials.Email))
	if email == "" || credentials.Password == "" {
		return models.LoginResponse{}, ValidationError("Email e senha são obrigatórios")
	}
	storedUser, err := service.Store.FindByEmail(ctx, email)
	if errors.Is(err, sql.ErrNoRows) {
		return models.LoginResponse{}, ErrInvalidCredentials
	}
	if err != nil {
		return models.LoginResponse{}, err
	}
	if bcrypt.CompareHashAndPassword([]byte(storedUser.Password), []byte(credentials.Password)) != nil {
		return models.LoginResponse{}, ErrInvalidCredentials
	}
	jwtSecret := strings.TrimSpace(service.JWTSecret)
	if jwtSecret == "" {
		return models.LoginResponse{}, ErrJWTConfiguration
	}

	expirationTime := time.Now().Add(tokenDuration)

	claims := &models.Claims{
		UserID: storedUser.ID,
		Role:   storedUser.Role,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.Itoa(storedUser.ID),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			Issuer:    jwtIssuer,
		},
	}

	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)

	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return models.LoginResponse{}, errors.Join(ErrTokenSigning, err)
	}

	response := models.LoginResponse{
		Token: tokenString,
		Name:  storedUser.Name,
		Email: storedUser.Email,
		Role:  storedUser.Role,
	}

	return response, nil
}

func (service AuthService) SendRecoveryCode(ctx context.Context, email string) error {
	email = strings.ToLower(strings.TrimSpace(email))
	address, err := mail.ParseAddress(email)
	if err != nil || address.Address != email {
		return ValidationError("Email inválido")
	}
	email, err = service.Store.GetUserEmail(ctx, email)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrUserNotFound
	}
	if err != nil {
		return errors.Join(ErrRecoveryLookup, err)
	}
	if email == "" {
		return ErrUserNotFound
	}
	return SendPasswordResetCode(email, func(code string) error {
		return SendEmailWithTemplate(email, "Código de Verificação para Redefinição de Senha", code)
	})
}

func (service AuthService) ResetPassword(ctx context.Context, token, password string) (PasswordResetTokenStatus, error) {
	if token == "" || !isStrongResetPassword(password) {
		return PasswordResetTokenInvalid, ValidationError("Requisição inválida")
	}
	// Reject unauthorized requests before performing the expensive password hash.
	_, status := CheckPasswordResetToken(token)
	if status != PasswordResetTokenValid {
		return status, nil
	}
	hash, err := bcrypt.GenerateFromPassword([]byte(password), bcrypt.DefaultCost)
	if err != nil {
		return status, errors.Join(ErrPasswordHash, err)
	}
	return CompletePasswordReset(token, func(email string) error {
		return service.Store.UpdatePasswordByEmail(ctx, string(hash), email)
	})
}

func isStrongResetPassword(password string) bool {
	if len([]rune(password)) < 8 || len(password) > 72 {
		return false
	}

	var hasUpper, hasLower, hasNumber bool
	for _, character := range password {
		hasUpper = hasUpper || unicode.IsUpper(character)
		hasLower = hasLower || unicode.IsLower(character)
		hasNumber = hasNumber || unicode.IsDigit(character)
	}

	hasSymbol := strings.ContainsAny(password, "?@#$%&")
	return hasUpper && hasLower && hasNumber && hasSymbol
}
