package handlers

import (
	"backend/src/services"
	"encoding/json"
	"net/http/httptest"
	"strings"
	"testing"
)

func TestVerifyCodeHandler(t *testing.T) {
	email := "handler@example.com"
	var code string
	if err := services.SendPasswordResetCode(email, func(value string) error { code = value; return nil }); err != nil {
		t.Fatal(err)
	}
	for _, test := range []struct {
		code string
		want int
	}{{"WRONG123", 400}, {code, 200}, {code, 400}} {
		request := httptest.NewRequest("POST", "/validate-reset-code", strings.NewReader(`{"email":"`+email+`","code":"`+test.code+`"}`))
		response := httptest.NewRecorder()
		(AuthHandler{}).ValidateVerificationCode(response, request)
		if response.Code != test.want {
			t.Fatalf("got %d want %d", response.Code, test.want)
		}
		if test.want == 200 {
			var result struct {
				Data struct {
					ResetToken string `json:"resetToken"`
				} `json:"data"`
			}
			if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
				t.Fatal(err)
			}
			if result.Data.ResetToken == "" {
				t.Fatal("missing resetToken")
			}
			if _, status := services.CheckPasswordResetToken(result.Data.ResetToken); status != services.PasswordResetTokenValid {
				t.Fatal("token not valid")
			}
		}
	}
}
func TestResetRequiresAuthorization(t *testing.T) {
	for _, body := range []string{`{"email":"x@y.com","code":"ABCDEFGH","newPassword":"Password1@"}`, `{"resetToken":"forged","newPassword":"Password1@"}`} {
		response := httptest.NewRecorder()
		(AuthHandler{}).ResetPassword(response, httptest.NewRequest("POST", "/reset-password", strings.NewReader(body)))
		if response.Code != 400 && response.Code != 401 {
			t.Fatalf("unauthorized reset: %d", response.Code)
		}
	}
}
