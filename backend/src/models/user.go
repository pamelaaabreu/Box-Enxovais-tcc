package models

import "github.com/golang-jwt/jwt/v5"

type User struct {
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

type Credentials struct {
	Email    string `json:"email"`
	Password string `json:"password"`
}

type Claims struct {
	UserID int    `json:"userId"`
	Role   string `json:"role"`
	jwt.RegisteredClaims
}

type LoginResponse struct {
	Token string `json:"token"`
	Name  string `json:"name"`
	Email string `json:"email"`
	Role  string `json:"role"`
}

type CreateUserRequest struct {
	Name     string `json:"name"`
	Email    string `json:"email"`
	Password string `json:"password"`
	Terms    bool   `json:"terms"`
}
