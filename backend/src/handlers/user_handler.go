package handlers

import (
	"backend/src/models"
	"backend/src/response"
	"backend/src/services"
	"errors"
	"log"
	"net/http"
)

type UserHandler struct {
	Service services.UserService
}

func (h UserHandler) CreateUser(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodPost) {
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	var user models.CreateUserRequest

	if !decodeBody(w, r, &user, smallJSONLimit, "Corpo da requisição inválido") {
		return
	}

	// Encaminha os dados para o service.
	if err := h.Service.Create(r.Context(), user); err != nil {
		handleCreateUserError(w, err)
		return
	}

	// Retorna HTTP 201, indicando que o usuário foi criado.
	response.JSON(w, http.StatusCreated, map[string]string{
		"message": "Usuário criado com sucesso",
	})
}

// Converte os erros do cadastro em respostas HTTP.
func handleCreateUserError(w http.ResponseWriter, err error) {
	var validation services.ValidationError

	if errors.As(err, &validation) {
		response.Error(w, http.StatusBadRequest, validation.Error())
		return
	}

	switch {
	case errors.Is(err, services.ErrEmailDuplicated),
		errors.Is(err, services.ErrUserDuplicated):

		response.Error(w, http.StatusConflict, err.Error())

	case errors.Is(err, services.ErrPasswordHash):
		log.Printf("Password hashing failed during registration")
		response.Error(w, http.StatusInternalServerError, "Erro interno ao criar usuário")

	default:
		log.Printf("User registration failed")
		response.Error(w, http.StatusInternalServerError, "Erro interno ao tentar criar usuário")
	}
}
