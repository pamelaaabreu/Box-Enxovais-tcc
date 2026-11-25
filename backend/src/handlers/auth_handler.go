package handlers

import (
	"backend/src/models"
	"backend/src/response"
	"backend/src/services"
	"errors"
	"log"
	"net/http"
)

type AuthHandler struct {
	Service services.AuthService
}

func (h AuthHandler) LoginUser(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodPost) {
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	var creds models.Credentials

	if !decodeBody(w, r, &creds, smallJSONLimit, "Corpo da requisição inválido") {
		return
	}

	// Encaminha as credenciais ao service.
	payload, err := h.Service.Login(r.Context(), creds)

	if err != nil {
		var validation services.ValidationError

		// Converte os erros do service em respostas HTTP.
		switch {
		case errors.As(err, &validation):
			response.Error(w, http.StatusBadRequest, validation.Error())

		case errors.Is(err, services.ErrInvalidCredentials):
			response.Error(w, http.StatusUnauthorized, "Email ou senha inválidos")

		case errors.Is(err, services.ErrJWTConfiguration):
			log.Println("JWT configuration missing")
			response.Error(w, http.StatusInternalServerError, "Configuração de autenticação inválida")

		case errors.Is(err, services.ErrTokenSigning):
			log.Println("JWT signing failed")
			response.Error(w, http.StatusInternalServerError, "Erro ao gerar token")

		default:
			log.Println("User lookup failed during login")
			response.Error(w, http.StatusInternalServerError, "Erro interno ao tentar fazer login")
		}

		return
	}

	// Retorna os dados de autenticação ao frontend.
	response.JSON(w, http.StatusOK, payload)
}
