package handlers

import (
	"backend/src/repositories"
	"backend/src/response"
	"database/sql"
	"encoding/json"
	"errors"
	"github.com/lib/pq"
	"io"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"
)

func (h ProductHandler) CatalogRegistrations(kind repositories.CatalogKind) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		store := h.Service.Store
		if r.Method == http.MethodGet {
			items, err := store.ListRegistrations(r.Context(), kind)
			if err != nil {
				catalogError(w, err)
				return
			}
			response.JSON(w, http.StatusOK, items)
			return
		}
		id := 0
		if r.Method != http.MethodPost {
			var err error
			id, err = strconv.Atoi(r.PathValue("id"))
			if err != nil || id <= 0 {
				response.Error(w, http.StatusBadRequest, "ID inválido")
				return
			}
		}
		if r.Method == http.MethodDelete {
			if err := store.DeleteRegistration(r.Context(), kind, id); err != nil {
				catalogError(w, err)
				return
			}
			w.WriteHeader(http.StatusNoContent)
			return
		}
		var body struct {
			Name string `json:"name"`
		}
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8192))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&body); err != nil || decoder.Decode(&struct{}{}) != io.EOF {
			response.Error(w, http.StatusBadRequest, "Informe um nome válido")
			return
		}
		name := strings.Join(strings.Fields(body.Name), " ")
		if name == "" || utf8.RuneCountInString(name) > 100 || strings.ContainsRune(name, 0) {
			response.Error(w, http.StatusBadRequest, "Informe um nome de até 100 caracteres")
			return
		}
		item, err := store.SaveRegistration(r.Context(), kind, id, name)
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

func catalogError(w http.ResponseWriter, err error) {
	var pg *pq.Error
	switch {
	case errors.Is(err, sql.ErrNoRows):
		response.Error(w, http.StatusNotFound, "Cadastro não encontrado")
	case errors.Is(err, repositories.ErrDuplicateCatalogName) || errors.As(err, &pg) && pg.Code == "23505":
		response.Error(w, http.StatusConflict, "Já existe um cadastro com esse nome")
	case errors.As(err, &pg) && pg.Code == "23503":
		response.Error(w, http.StatusConflict, "Este cadastro está vinculado a produtos e não pode ser excluído")
	default:
		response.Error(w, http.StatusInternalServerError, "Não foi possível concluir a operação")
	}
}
