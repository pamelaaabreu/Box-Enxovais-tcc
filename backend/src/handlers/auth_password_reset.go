package handlers

import (
	"backend/src/models"
	"backend/src/response"
	"backend/src/services"
	"errors"
	"log"
	"net/http"
	"strconv"
)

type ForgotPasswordRequest = models.ForgotPasswordRequest

type ResetPasswordRequest = models.ResetPasswordRequest

type ValidateVerificationCodeRequest = models.ValidateVerificationCodeRequest

func (h AuthHandler) SendVerificationCode(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodPost) {
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	var req ForgotPasswordRequest

	if !decodeBody(w, r, &req, smallJSONLimit, "Email inválido") {
		return
	}

	err := h.Service.SendRecoveryCode(r.Context(), req.Email)
	var validation services.ValidationError
	if errors.As(err, &validation) {
		response.Error(w, http.StatusBadRequest, "Email inválido")
		return
	}
	if err != nil && !errors.Is(err, services.ErrUserNotFound) && !errors.Is(err, services.ErrResetCodeCooldown) {
		log.Println("Falha interna na solicitação de recuperação")
	}
	w.Header().Set("Retry-After", strconv.Itoa(int(services.ResetResendCooldown.Seconds())))
	response.Success(w, http.StatusOK, "Se o e-mail estiver cadastrado, você receberá um código de recuperação.", nil)
}

func (h AuthHandler) ResetPassword(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodPost) {
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	var req ResetPasswordRequest

	if !decodeBody(w, r, &req, smallJSONLimit, "Requisição inválida") {
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
	if !allowMethods(w, r, http.MethodPost) {
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	w.Header().Set("Cache-Control", "no-store")
	var req ValidateVerificationCodeRequest

	if !decodeBody(w, r, &req, smallJSONLimit, "Código inválido") {
		return
	}
	if req.Email == "" || req.Code == "" {
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
