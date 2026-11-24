package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesAuth(mux *http.ServeMux, auth handlers.AuthHandler, users handlers.UserHandler) {
	publicRoute(mux, "POST /register", users.CreateUser)
	publicRoute(mux, "POST /login", auth.LoginUser)
	publicRoute(mux, "POST /send-reset-token", auth.SendVerificationCode)
	publicRoute(mux, "POST /validate-reset-code", auth.ValidateVerificationCode)
	publicRoute(mux, "POST /validate-reset-token", auth.ValidateResetToken)
	publicRoute(mux, "POST /reset-password", auth.ResetPassword)
}
