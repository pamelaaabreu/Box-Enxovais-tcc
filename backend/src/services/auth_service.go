package services

import (
	"context"
	"database/sql"
	"errors"
	"strconv"
	"strings"
	"time"

	"backend/src/models"
	"backend/src/repositories"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

// Configurações do token JWT.
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

	// Permite substituir a função de envio de e-mail,
	// especialmente durante os testes.
	RecoveryEmail func(email, code string) error
}

// Autentica o usuário e retorna seu token de acesso.
func (service AuthService) Login(
	ctx context.Context,
	credentials models.Credentials,
) (models.LoginResponse, error) {

	email := normalizeEmail(credentials.Email)

	if email == "" || credentials.Password == "" {
		return models.LoginResponse{},
			ValidationError("Email e senha são obrigatórios")
	}

	// Busca o usuário utilizando o repository.
	storedUser, err := service.Store.FindByEmail(ctx, email)

	// Não informa separadamente se o usuário existe.
	if errors.Is(err, sql.ErrNoRows) {
		return models.LoginResponse{}, ErrInvalidCredentials
	}

	if err != nil {
		return models.LoginResponse{}, err
	}

	// Compara a senha informada com o hash armazenado.
	if bcrypt.CompareHashAndPassword(
		[]byte(storedUser.Password),
		[]byte(credentials.Password),
	) != nil {
		return models.LoginResponse{}, ErrInvalidCredentials
	}

	// Verifica se a chave secreta foi configurada.
	jwtSecret := strings.TrimSpace(service.JWTSecret)

	if jwtSecret == "" {
		return models.LoginResponse{}, ErrJWTConfiguration
	}

	// Define a expiração do token.
	issuedAt := time.Now()
	expirationTime := issuedAt.Add(tokenDuration)

	// Informações que serão armazenadas no JWT.
	claims := &models.Claims{
		UserID: storedUser.ID,
		Role:   storedUser.Role,

		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   strconv.Itoa(storedUser.ID),
			IssuedAt:  jwt.NewNumericDate(issuedAt),
			ExpiresAt: jwt.NewNumericDate(expirationTime),
			Issuer:    jwtIssuer,
		},
	}

	// Cria o token utilizando o algoritmo HS256.
	token := jwt.NewWithClaims(
		jwt.SigningMethodHS256,
		claims,
	)

	// Assina o token utilizando a chave secreta.
	tokenString, err := token.SignedString(
		[]byte(jwtSecret),
	)

	if err != nil {
		return models.LoginResponse{},
			errors.Join(ErrTokenSigning, err)
	}

	// Retorna apenas as informações necessárias ao frontend.
	response := models.LoginResponse{
		Token: tokenString,
		Name:  storedUser.Name,
		Email: storedUser.Email,
		Role:  storedUser.Role,
	}

	return response, nil
}

// Envia o código de recuperação de senha.
func (service AuthService) SendRecoveryCode(
	ctx context.Context,
	email string,
) error {

	// Normaliza e valida o formato do e-mail.
	email = normalizeEmail(email)
	if !isValidEmail(email) {
		return ValidationError("Email inválido")
	}
	var err error

	// Verifica se o e-mail está cadastrado.
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

	// Encaminha uma função responsável pelo envio do código.
	return SendPasswordResetCode(
		email,
		func(code string) error {

			// Utiliza a função personalizada, quando disponível.
			if service.RecoveryEmail != nil {
				return service.RecoveryEmail(email, code)
			}

			// Caso contrário, utiliza o envio padrão.
			return SendEmailWithTemplate(
				email,
				"Código de Verificação para Redefinição de Senha",
				code,
			)
		},
	)
}

// Redefine a senha utilizando um token de recuperação.
func (service AuthService) ResetPassword(
	ctx context.Context,
	token, password string,
) (PasswordResetTokenStatus, error) {

	// Valida os dados recebidos.
	if token == "" || !isStrongResetPassword(password) {
		return PasswordResetTokenInvalid,
			ValidationError("Requisição inválida")
	}

	// Valida o token antes de executar o cálculo do hash.
	_, status := CheckPasswordResetToken(token)

	if status != PasswordResetTokenValid {
		return status, nil
	}

	// Gera o hash da nova senha.
	hash, err := bcrypt.GenerateFromPassword(
		[]byte(password),
		bcrypt.DefaultCost,
	)

	if err != nil {
		return status, errors.Join(ErrPasswordHash, err)
	}

	// Encaminha a atualização da senha ao repository.
	return CompletePasswordReset(
		token,
		func(email string) error {
			return service.Store.UpdatePasswordByEmail(
				ctx,
				string(hash),
				email,
			)
		},
	)
}

// Cadastro e recuperação seguem as mesmas regras do Angular (ASCII/UTF-16 e bcrypt).
func isStrongResetPassword(password string) bool { return isStrongPassword(password) }
