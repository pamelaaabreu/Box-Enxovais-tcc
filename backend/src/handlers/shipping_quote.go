package handlers

import (
	"backend/src/repositories"
	"backend/src/response"
	"database/sql"
	"errors"
	"net/http"
)

func QuoteShipping(database *sql.DB) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		cep, valid := repositories.ParseShippingCEP(r.URL.Query().Get("cep"))
		if !valid {
			response.Error(w, http.StatusBadRequest, "Informe um CEP válido.")
			return
		}

		value, err := repositories.QuoteShipping(r.Context(), database, cep)
		if errors.Is(err, sql.ErrNoRows) {
			response.Error(w, http.StatusNotFound, "Entrega indisponível para este CEP no momento.")
			return
		}
		if err != nil {
			response.Error(w, http.StatusInternalServerError, "Não foi possível consultar a entrega.")
			return
		}

		response.JSON(w, http.StatusOK, value)
	}
}
