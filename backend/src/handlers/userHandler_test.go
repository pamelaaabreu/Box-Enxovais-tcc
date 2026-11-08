package handlers

import (
	"backend/src/models"
	"backend/src/services"
	"encoding/json"
	"errors"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestCreateUserRejectsInvalidHTTP(t *testing.T) {
	valid := models.CreateUserRequest{Name: "Maria Silva", Email: "maria@example.com", Password: "Senha1@x", Terms: true}
	cases := []struct {
		name   string
		mutate func(*models.CreateUserRequest)
	}{
		{"missing name", func(u *models.CreateUserRequest) { u.Name = "" }},
		{"single name", func(u *models.CreateUserRequest) { u.Name = "Maria" }},
		{"missing email", func(u *models.CreateUserRequest) { u.Email = "" }},
		{"invalid email", func(u *models.CreateUserRequest) { u.Email = "invalid" }},
		{"missing password", func(u *models.CreateUserRequest) { u.Password = "" }},
		{"weak password", func(u *models.CreateUserRequest) { u.Password = "password" }},
		{"too many bytes", func(u *models.CreateUserRequest) { u.Password = "Senha1@" + strings.Repeat("é", 34) }},
		{"short multibyte password", func(u *models.CreateUserRequest) { u.Password = "Aa1@é" }},
		{"terms refused", func(u *models.CreateUserRequest) { u.Terms = false }},
	}
	for _, c := range cases {
		t.Run(c.name, func(t *testing.T) {
			u := valid
			c.mutate(&u)
			body, _ := json.Marshal(u)
			w := httptest.NewRecorder()
			(UserHandler{}).CreateUser(w, httptest.NewRequest("POST", "/register", strings.NewReader(string(body))))
			if w.Code != 400 {
				t.Fatalf("status=%d", w.Code)
			}
			if strings.Contains(w.Body.String(), u.Password) && u.Password != "" {
				t.Fatal("password disclosed")
			}
		})
	}
	for _, body := range []string{`{"password":123}`, `{} {}`, `{"confirmPassword":"secret"}`} {
		w := httptest.NewRecorder()
		(UserHandler{}).CreateUser(w, httptest.NewRequest("POST", "/register", strings.NewReader(body)))
		if w.Code != 400 {
			t.Fatalf("malformed request status=%d", w.Code)
		}
	}
}

func TestCreateUserDatabaseErrors(t *testing.T) {
	for _, c := range []struct {
		err     error
		status  int
		message string
	}{
		{services.ErrEmailDuplicated, 409, "email_duplicado"},
		{errors.New("private database detail"), 500, "Erro interno ao tentar criar usuário"},
	} {
		w := httptest.NewRecorder()
		handleCreateUserError(w, c.err)
		if w.Code != c.status || !strings.Contains(w.Body.String(), c.message) || strings.Contains(w.Body.String(), "private database detail") {
			t.Fatal("unexpected error response")
		}
	}
}
