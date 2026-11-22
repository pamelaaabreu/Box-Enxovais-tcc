package handlers

import (
	"backend/src/models"
	"backend/src/response"
	"backend/src/services"
	"encoding/json"
	"errors"
	"log"
	"net/http"
)

type AuthHandler struct{ Service services.AuthService }

func (h AuthHandler) LoginUser(w http.ResponseWriter, r *http.Request) {
	var creds models.Credentials

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	err := decoder.Decode(&creds)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Corpo da requisição inválido")
		return
	}

	payload, err := h.Service.Login(r.Context(), creds)
	if err != nil {
		var validation services.ValidationError
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
	response.JSON(w, http.StatusOK, payload)
}
