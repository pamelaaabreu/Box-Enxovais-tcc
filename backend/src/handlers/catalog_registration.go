package handlers

import (
	"backend/src/repositories"
	"backend/src/response"
	"backend/src/services"
	"database/sql"
	"errors"
	"github.com/lib/pq"
	"net/http"
	"strconv"
)

func (h ProductHandler) CatalogRegistrations(kind repositories.CatalogKind) http.HandlerFunc {

	return func(w http.ResponseWriter, r *http.Request) {
		if !allowMethods(w, r, http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodDelete) {
			return
		}

		w.Header().Set("Cache-Control", "no-store")

		store := h.Service

		// Lista as marcas ou categorias cadastradas.
		if r.Method == http.MethodGet {

			items, err := store.ListRegistrations(r.Context(), kind)

			if err != nil {
				catalogError(w, err)
				return
			}

			response.JSON(w, http.StatusOK, items)
			return
		}

		// ID zero representa um novo cadastro.
		id := 0

		// Nas demais operações, exige um ID existente.
		if r.Method != http.MethodPost {

			var err error

			id, err = strconv.Atoi(r.PathValue("id"))

			if err != nil || id <= 0 {
				response.Error(w, http.StatusBadRequest, "ID inválido")
				return
			}
		}

		// Exclui o cadastro.
		if r.Method == http.MethodDelete {

			if err := store.DeleteRegistration(r.Context(), kind, id); err != nil {
				catalogError(w, err)
				return
			}

			w.WriteHeader(http.StatusNoContent)
			return
		}

		// Recebe somente o nome do cadastro.
		var body struct {
			Name string `json:"name"`
		}

		// Limita a requisição a 8 KiB.
		if !decodeBody(w, r, &body, 8192, "Informe um nome válido") {
			return
		}

		// Cadastra ou atualiza a marca ou categoria.
		item, err := store.SaveRegistration(r.Context(), kind, id, body.Name)

		if err != nil {
			catalogError(w, err)
			return
		}

		status := http.StatusOK

		if r.Method == http.MethodPost {
			status = http.StatusCreated
		}

		response.JSON(w, status, item)
	}
}

// Centraliza os erros dos cadastros.
func catalogError(w http.ResponseWriter, err error) {

	var pg *pq.Error
	var validation services.ValidationError

	switch {
	case errors.As(err, &validation):
		response.Error(w, http.StatusBadRequest, validation.Error())

	case errors.Is(err, sql.ErrNoRows):
		response.Error(w, http.StatusNotFound, "Cadastro não encontrado")

	case errors.Is(err, repositories.ErrDuplicateCatalogName) ||
		errors.As(err, &pg) && pg.Code == "23505":

		response.Error(w, http.StatusConflict, "Já existe um cadastro com esse nome")

	case errors.As(err, &pg) && pg.Code == "23503":

		response.Error(w, http.StatusConflict, "Este cadastro está vinculado a produtos e não pode ser excluído")

	default:
		response.Error(w, http.StatusInternalServerError, "Não foi possível concluir a operação")
	}
}
