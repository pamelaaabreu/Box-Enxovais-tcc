package handlers

import (
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/response"
	"backend/src/services"
	"database/sql"
	"errors"
	"net/http"
	"strconv"

	"github.com/lib/pq"
)

// Lista as faixas de entrega cadastradas.
func ListShippingRanges(database *sql.DB) http.HandlerFunc {

	return func(w http.ResponseWriter, r *http.Request) {

		items, err := repositories.ListShippingRanges(
			r.Context(),
			database,
		)

		if err != nil {
			response.Error(w, http.StatusInternalServerError, "Não foi possível listar as faixas.")
			return
		}

		response.JSON(w, http.StatusOK, items)
	}
}

// Cadastra ou atualiza uma faixa de entrega.
func SaveShippingRange(database *sql.DB) http.HandlerFunc {

	return func(w http.ResponseWriter, r *http.Request) {

		var item models.ShippingRange

		// Limita o corpo da requisição a 4 KiB.
		if !decodeBody(w, r, &item, 4096, "Dados da faixa inválidos.") {
			return
		}

		// Valida os CEPs, valores e prazos no service.
		start, end, valid := services.ValidateShippingRange(&item)

		if !valid {
			response.Error(w, http.StatusBadRequest, "Confira o nome, os limites de CEP, o valor e os prazos.")
			return
		}

		status := http.StatusCreated

		var err error

		// PATCH representa a atualização de uma faixa.
		if r.Method == http.MethodPatch {

			id, parseErr := strconv.ParseInt(r.PathValue("id"), 10, 64)

			if parseErr != nil || id <= 0 {
				response.Error(w, http.StatusBadRequest, "Faixa inválida.")
				return
			}

			err = repositories.UpdateShippingRange(
				r.Context(),
				database,
				id,
				&item,
				start,
				end,
			)

			status = http.StatusOK

		} else {

			// Cadastra uma nova faixa de entrega.
			err = repositories.CreateShippingRange(
				r.Context(),
				database,
				&item,
				start,
				end,
			)
		}

		var pg *pq.Error

		switch {

		case errors.Is(err, sql.ErrNoRows):
			response.Error(w, http.StatusNotFound, "Faixa não encontrada.")

		// Trata a violação da restrição de exclusão.
		case errors.As(err, &pg) && pg.Code == "23P01":
			response.Error(w, http.StatusConflict, "Já existe uma faixa ativa que cobre parte deste intervalo.")

		case err != nil:
			response.Error(w, http.StatusInternalServerError, "Não foi possível salvar a faixa.")

		default:
			response.JSON(w, status, item)
		}
	}
}

// Exclui uma faixa de entrega.
func DeleteShippingRange(database *sql.DB) http.HandlerFunc {

	return func(w http.ResponseWriter, r *http.Request) {

		id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)

		if err != nil || id <= 0 {
			response.Error(w, http.StatusBadRequest, "Faixa inválida.")
			return
		}

		deleted, err := repositories.DeleteShippingRange(
			r.Context(),
			database,
			id,
		)

		if err != nil {
			response.Error(w, http.StatusInternalServerError, "Não foi possível excluir a faixa.")
			return
		}

		if !deleted {
			response.Error(w, http.StatusNotFound, "Faixa não encontrada.")
			return
		}

		w.WriteHeader(http.StatusNoContent)
	}
}
