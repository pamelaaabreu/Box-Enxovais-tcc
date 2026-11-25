package handlers

import (
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/response"
	"backend/src/services"
	"database/sql"
	"errors"
	"github.com/lib/pq"
	"net/http"
	"strconv"
)

// Recupera e valida o ID do produto.
func productID(r *http.Request) (int64, error) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)

	if err == nil && id <= 0 {
		err = strconv.ErrSyntax
	}

	return id, err
}

// Centraliza o tratamento dos erros administrativos.
func adminProductError(w http.ResponseWriter, err error) {
	var pg *pq.Error

	switch {

	case errors.Is(err, sql.ErrNoRows):
		response.Error(w, http.StatusNotFound, "Produto ou imagem não encontrado.")

	case errors.Is(err, repositories.ErrProductConflict),
		errors.Is(err, repositories.ErrVariantConflict),
		errors.Is(err, repositories.ErrImageConflict):

		response.Error(w, http.StatusConflict, err.Error())

	case errors.Is(err, services.ErrProductDetails),
		errors.Is(err, services.ErrProductVariants):

		response.Error(w, http.StatusBadRequest, err.Error())

	// Trata violações de restrições do PostgreSQL.
	case errors.As(err, &pg) &&
		(pg.Code == "23503" ||
			pg.Code == "23505" ||
			pg.Code == "23514"):

		response.Error(w, http.StatusConflict, "Há vínculos ou dados incompatíveis. Recarregue o produto e revise as informações.")

	default:
		response.Error(w, http.StatusInternalServerError, "Não foi possível concluir a operação. Tente novamente.")
	}
}

func (h ProductHandler) AdminProduct(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet, http.MethodPatch, http.MethodDelete) {
		return
	}

	id, err := productID(r)

	if err != nil {
		response.Error(w, http.StatusBadRequest, "Produto inválido.")
		return
	}

	switch r.Method {

	case http.MethodGet:

		// Consulta os dados atuais do produto.
		products, err := h.Service.Get(r.Context(), id)

		if err != nil {
			adminProductError(w, err)
			return
		}

		if len(products) == 0 {
			adminProductError(w, sql.ErrNoRows)
			return
		}

		w.Header().Set("Cache-Control", "no-store")
		response.JSON(w, http.StatusOK, products[0])

	case http.MethodPatch:

		// Recebe somente os dados definidos
		// na estrutura de atualização.
		var request models.ProductUpdateRequest

		if !decodeBody(w, r, &request, productJSONLimit, "Dados inválidos. Envie somente os campos editáveis do produto.") {
			return
		}

		// Atualiza o produto.
		if err = h.Service.Update(r.Context(), id, request); err != nil {
			adminProductError(w, err)
			return
		}

		// Consulta novamente o produto atualizado.
		products, err := h.Service.Get(r.Context(), id)

		if err != nil {
			adminProductError(w, err)
			return
		}

		if len(products) == 0 {
			adminProductError(w, sql.ErrNoRows)
			return
		}
		response.JSON(w, http.StatusOK, products[0])

	case http.MethodDelete:

		// Exclui ou arquiva o produto conforme
		// as regras de integridade do repository.
		action, err := h.Service.Remove(r.Context(), id)

		if err != nil {
			adminProductError(w, err)
			return
		}

		response.JSON(w, http.StatusOK, map[string]string{
			"action": action,
		})
	}
}
