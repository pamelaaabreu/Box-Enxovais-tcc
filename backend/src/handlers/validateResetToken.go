package handlers

import (
	"backend/src/response"
	"backend/src/services"
	"encoding/json"
	"net/http"
)

type ValidateResetTokenRequest struct {
	ResetToken string `json:"resetToken"`
}

func (h AuthHandler) ValidateResetToken(w http.ResponseWriter, r *http.Request) {
	var req ValidateResetTokenRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.ResetToken == "" {
		response.Error(w, http.StatusBadRequest, "Token não informado")
		return
	}

	_, status := services.CheckPasswordResetToken(req.ResetToken)
	if status == services.PasswordResetTokenExpired {
		response.Error(w, http.StatusGone, "Token de recuperação expirado")
		return
	}
	if status != services.PasswordResetTokenValid {
		response.Error(w, http.StatusUnauthorized, "Token de recuperação inválido")
		return
	}

	response.Success(w, http.StatusOK, "Token válido.", nil)
}
