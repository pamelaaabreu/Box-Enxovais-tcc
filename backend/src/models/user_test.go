package models

import (
	"encoding/json"
	"strings"
	"testing"
)

func TestUserDoesNotSerializePassword(t *testing.T) {
	raw, err := json.Marshal(User{Password: "private-hash"})
	if err != nil || strings.Contains(string(raw), "password") || strings.Contains(string(raw), "private-hash") {
		t.Fatal("senha exposta ou falha", err)
	}
	var login Credentials
	if err := json.Unmarshal([]byte(`{"email":"test@example.test","password":"secret"}`), &login); err != nil || login.Password != "secret" {
		t.Fatal("contrato login", err)
	}
	var registration CreateUserRequest
	if err := json.Unmarshal([]byte(`{"password":"secret"}`), &registration); err != nil || registration.Password != "secret" {
		t.Fatal("contrato cadastro", err)
	}
}
