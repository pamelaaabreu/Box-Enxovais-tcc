package handlers

import (
	"backend/src/repositories"
	"backend/src/response"
	"database/sql"
	"errors"
	"net/http"
)

// Retorna uma função responsável por consultar o frete.
func QuoteShipping(database *sql.DB) http.HandlerFunc {

	return func(w http.ResponseWriter, r *http.Request) {

		// Recupera e valida o CEP informado na URL.
		cep, valid := repositories.ParseShippingCEP(
			r.URL.Query().Get("cep"),
		)

		if !valid {
			response.Error(
				w,
				http.StatusBadRequest,
				"Informe um CEP válido.",
			)

			return
		}

		// Consulta a faixa de entrega correspondente.
		value, err := repositories.QuoteShipping(
			r.Context(),
			database,
			cep,
		)

		if errors.Is(err, sql.ErrNoRows) {
			response.Error(
				w,
				http.StatusNotFound,
				"Entrega indisponível para este CEP no momento.",
			)

			return
		}

		if err != nil {
			response.Error(
				w,
				http.StatusInternalServerError,
				"Não foi possível consultar a entrega.",
			)

			return
		}

		response.JSON(w, http.StatusOK, value)
	}
}
