package routes

import (
	"backend/src/handlers"
	"backend/src/repositories"
	"backend/src/services"
	"bytes"
	"errors"
	"image"
	"image/png"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestHandlerRecoveryPrivacyPostgres(t *testing.T) {
	db, execute := checkoutTestDB(t)
	execute(`UPDATE users SET email='recovery-handler@example.invalid' WHERE id=1`)
	sent := 0
	handler := handlers.AuthHandler{Service: services.AuthService{Store: repositories.UserRepository{DB: db}, RecoveryEmail: func(email, code string) error { sent++; return nil }}}
	call := func(email string) *httptest.ResponseRecorder {
		w := httptest.NewRecorder()
		handler.SendVerificationCode(w, httptest.NewRequest("POST", "/send-reset-token", strings.NewReader(`{"email":"`+email+`"}`)))
		return w
	}
	registered := call("recovery-handler@example.invalid")
	unknown := call("unknown-handler@example.invalid")
	cooldown := call("recovery-handler@example.invalid")
	for _, got := range []*httptest.ResponseRecorder{registered, unknown, cooldown} {
		if got.Code != 200 || got.Body.String() != registered.Body.String() || got.Header().Get("Retry-After") != registered.Header().Get("Retry-After") || got.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("account existence leaked through public response")
		}
	}
	if sent != 1 {
		t.Fatal("cooldown no longer enforced")
	}
	execute(`UPDATE users SET email='smtp-failure@example.invalid' WHERE id=1`)
	handler.Service.RecoveryEmail = func(string, string) error { return errors.New("private SMTP failure") }
	failure := call("smtp-failure@example.invalid")
	if failure.Code != 200 || failure.Body.String() != registered.Body.String() {
		t.Fatal("SMTP failure reveals account")
	}
	if code := call("invalid").Code; code != 400 {
		t.Fatal("invalid email format accepted", code)
	}
}

func validPNGFixture(t *testing.T) []byte {
	t.Helper()
	var buffer bytes.Buffer
	if err := png.Encode(&buffer, image.NewRGBA(image.Rect(0, 0, 2, 2))); err != nil {
		t.Fatal(err)
	}
	return buffer.Bytes()
}
