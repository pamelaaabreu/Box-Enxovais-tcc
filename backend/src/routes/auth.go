package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesAuth(mux *http.ServeMux, auth handlers.AuthHandler, users handlers.UserHandler) {
	publicRoute(mux, http.MethodPost, "/register", users.CreateUser)
	publicRoute(mux, http.MethodPost, "/login", auth.LoginUser)
	publicRoute(mux, http.MethodPost, "/send-reset-token", auth.SendVerificationCode)
	publicRoute(mux, http.MethodPost, "/validate-reset-code", auth.ValidateVerificationCode)
	publicRoute(mux, http.MethodPost, "/validate-reset-token", auth.ValidateResetToken)
	publicRoute(mux, http.MethodPost, "/reset-password", auth.ResetPassword)
}
