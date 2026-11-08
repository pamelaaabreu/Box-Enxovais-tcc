package handlers

import (
	"backend/src/response"
	"backend/src/services"
	"encoding/json"
	"errors"
	"net/http"
)

type ForgotPasswordRequest struct {
	Email string `json:"email"`
}

type ResetPasswordRequest struct {
	ResetToken  string `json:"resetToken"`
	NewPassword string `json:"newPassword"`
}

type ValidateVerificationCodeRequest struct {
	Email string `json:"email"`
	Code  string `json:"code"`
}

func (h AuthHandler) SendVerificationCode(w http.ResponseWriter, r *http.Request) {
	var req ForgotPasswordRequest

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil || req.Email == "" {
		response.Error(w, http.StatusBadRequest, "Email inválido")
		return
	}

	err = h.Service.SendRecoveryCode(r.Context(), req.Email)
	if err != nil {
		var validation services.ValidationError
		switch {
		case errors.As(err, &validation):
			response.Error(w, http.StatusBadRequest, "Email inválido")
		case errors.Is(err, services.ErrUserNotFound):
			response.Error(w, http.StatusNotFound, "Email não encontrado")
		case errors.Is(err, services.ErrRecoveryLookup):
			response.Error(w, http.StatusInternalServerError, "Erro ao buscar usuário")
		case errors.Is(err, services.ErrResetCodeCooldown):
			w.Header().Set("Retry-After", "30")
			response.Error(w, http.StatusTooManyRequests, "Aguarde 30 segundos para reenviar")
		default:
			response.Error(w, http.StatusInternalServerError, "Erro ao enviar email")
		}
		return
	}

	response.Success(w, http.StatusOK, "Código enviado com sucesso.", nil)
}

func (h AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	var req ResetPasswordRequest

	err := json.NewDecoder(r.Body).Decode(&req)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Requisição inválida")
		return
	}

	tokenStatus, err := h.Service.ResetPassword(r.Context(), req.ResetToken, req.NewPassword)
	if err != nil {
		var validation services.ValidationError
		switch {
		case errors.As(err, &validation):
			response.Error(w, http.StatusBadRequest, "Requisição inválida")
		case errors.Is(err, services.ErrPasswordHash):
			response.Error(w, http.StatusInternalServerError, "Erro ao processar a senha")
		default:
			response.Error(w, http.StatusInternalServerError, "Erro ao atualizar senha")
		}
		return
	}
	if tokenStatus != services.PasswordResetTokenValid {
		resetTokenError(w, tokenStatus)
		return
	}

	response.Success(w, http.StatusOK, "Senha atualizada com sucesso.", nil)
}

func (h AuthHandler) ValidateVerificationCode(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	var req ValidateVerificationCodeRequest

	if err := json.NewDecoder(r.Body).Decode(&req); err != nil || req.Email == "" || req.Code == "" {
		response.Error(w, http.StatusBadRequest, "Código inválido")
		return
	}

	resetToken, status, err := services.ExchangeVerificationCode(req.Email, req.Code)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Erro ao autorizar redefinição de senha")
		return
	}
	switch status {
	case services.VerificationCodeExpired:
		response.Error(w, http.StatusGone, "Código expirado")
		return
	case services.VerificationCodeInvalid:
		response.Error(w, http.StatusBadRequest, "Código inválido")
		return
	}

	response.Success(w, http.StatusOK, "Código válido.", map[string]string{"resetToken": resetToken})
}

func resetTokenError(w http.ResponseWriter, status services.PasswordResetTokenStatus) {
	if status == services.PasswordResetTokenExpired {
		response.Error(w, http.StatusGone, "Token de recuperação expirado")
	} else {
		response.Error(w, http.StatusUnauthorized, "Token de recuperação inválido")
	}
}
