package models

import "github.com/golang-jwt/jwt/v5"

type User struct {
	// omitempty -> não inclui o campo ID no JSON caso seu valor seja zero.
	ID           int    `json:"id,omitempty"`
	Name         string `json:"name"`
	Email        string `json:"email"`
	BirthDate    string `json:"birthDate"`
	CPF          string `json:"cpf"`
	Phone        string `json:"phone"`
	Street       string `json:"street"`
	Neighborhood string `json:"neighborhood"`
	Number       string `json:"number"`
	ZipCode      string `json:"zipCode"`
	State        string `json:"state"`
	City         string `json:"city"`
	Password     string `json:"password"`
	Role         string `json:"role"`
}

// DTO de entrada -> apenas o necessário
type Credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Claims struct {
	UserID int    `json:"userId"`
	Role   string `json:"role"`
	// incorpora os campos padronizados da biblioteca JWT.
	jwt.RegisteredClaims
}

// DTO de saída.
type LoginResponse struct {
	Token string `json:"token"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

// DTO de entrada p/ cadastro.
type CreateUserRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Terms    bool   `json:"terms"`
}
