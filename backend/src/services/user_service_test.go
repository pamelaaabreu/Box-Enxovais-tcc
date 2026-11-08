package services

import (
	"backend/src/models"
	"testing"
)

func TestIsStrongPassword(t *testing.T) {
	tests := []struct {
		password string
		want     bool
	}{
		{password: "Senha1@x", want: true},
		{password: "curta1@", want: false},
		{password: "semsenha1@", want: false},
		{password: "SEMSENHA1@", want: false},
		{password: "SemNumero@", want: false},
		{password: "SemSimbolo1", want: false},
	}

	for _, tt := range tests {
		if got := isStrongPassword(tt.password); got != tt.want {
			t.Errorf("isStrongPassword(%q) = %v; want %v", tt.password, got, tt.want)
		}
	}
}

func TestValidateCreateUser(t *testing.T) {
	tests := []struct {
		name string
		user models.CreateUserRequest
		want string
	}{
		{
			name: "valid short registration",
			user: models.CreateUserRequest{
				Name:     "Maria Silva",
				Email:    "maria@example.com",
				Password: "Senha1@x",
				Terms:    true,
			},
		},
		{
			name: "requires full name",
			user: models.CreateUserRequest{
				Name:     "Maria",
				Email:    "maria@example.com",
				Password: "Senha1@x",
				Terms:    true,
			},
			want: "Informe seu nome e sobrenome",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			if got := validateCreateUser(tt.user); got != tt.want {
				t.Errorf("validateCreateUser() = %q; want %q", got, tt.want)
			}
		})
	}
}

func TestCreateUserNormalization(t *testing.T) {
	u := models.CreateUserRequest{Name: "  Maria Silva  ", Email: " MARIA@EXAMPLE.COM ", Password: "Senha1@x", Terms: true}
	normalizeCreateUserData(&u)
	if u.Name != "Maria Silva" || u.Email != "maria@example.com" || validateCreateUser(u) != "" {
		t.Fatal("normalization or valid input rejected")
	}
}
