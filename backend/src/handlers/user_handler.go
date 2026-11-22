package handlers

import (
	"backend/src/models"
	"backend/src/response"
	"backend/src/services"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
)

type UserHandler struct{ Service services.UserService }

func (h UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	var user models.CreateUserRequest

	decoder := json.NewDecoder(r.Body)
	decoder.DisallowUnknownFields()

	err := decoder.Decode(&user)
	if err != nil {
		log.Printf("ERRO AO DECODIFICAR JSON DO CADASTRO: %v", err)
		response.Error(w, http.StatusBadRequest, "Corpo da requisição inválido")
		return
	}

	if decoder.Decode(&struct{}{}) != io.EOF {
		response.Error(w, http.StatusBadRequest, "Corpo da requisição inválido")
		return
	}

	if err := h.Service.Create(r.Context(), user); err != nil {
		handleCreateUserError(w, err)
		return
	}
	response.JSON(w, http.StatusCreated, map[string]string{
		"message": "Usuário criado com sucesso",
	})
}

func handleCreateUserError(w http.ResponseWriter, err error) {
	var validation services.ValidationError
	if errors.As(err, &validation) {
		response.Error(w, http.StatusBadRequest, validation.Error())
		return
	}
	switch {
	case errors.Is(err, services.ErrEmailDuplicated), errors.Is(err, services.ErrUserDuplicated):
		response.Error(w, http.StatusConflict, err.Error())
	case errors.Is(err, services.ErrPasswordHash):
		log.Printf("Password hashing failed during registration")
		response.Error(w, http.StatusInternalServerError, "Erro interno ao criar usuário")
	default:
		log.Printf("User registration failed")
		response.Error(w, http.StatusInternalServerError, "Erro interno ao tentar criar usuário")
	}
}
