package handlers

import (
	"backend/src/models"
	"backend/src/response"
	"backend/src/services"
	"net/http"
)

type ValidateResetTokenRequest = models.ValidateResetTokenRequest

func (h AuthHandler) ValidateResetToken(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodPost) {
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	var req ValidateResetTokenRequest
	if !decodeBody(w, r, &req, smallJSONLimit, "Token não informado") {
		return
	}
	if req.ResetToken == "" {
		response.Error(w, http.StatusBadRequest, "Token não informado")
		return
	}

	_, status := services.CheckPasswordResetToken(req.ResetToken)
	if status != services.PasswordResetTokenValid {
		resetTokenError(w, status)
		return
	}

	response.Success(w, http.StatusOK, "Token válido.", nil)
}
