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
)

func (h ProductHandler) SaveProductVariants(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodPut) {
		return
	}

	// Valida o ID do produto.
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)

	if err != nil || id <= 0 {
		response.Error(w, http.StatusBadRequest, "Produto inválido")
		return
	}

	// Estrutura dos dados recebidos.
	var body struct {
		Variants []models.ProductVariant       `json:"variants"`
		Expected *[]models.ProductVariant      `json:"expected_variants"`
		Commerce *models.ProductCommerceChange `json:"commerce,omitempty"`
	}

	// Limita a requisição a 128 KiB.
	if !decodeBody(w, r, &body, 128<<10, "Informe as variações e recarregue os dados do produto") {
		return
	}
	if body.Expected == nil {

		response.Error(w, http.StatusBadRequest, "Informe as variações e recarregue os dados do produto")
		return
	}

	// Encaminha as variantes novas e esperadas.
	items, err := h.Service.SaveVariants(
		r.Context(),
		id,
		body.Variants,
		*body.Expected,
		body.Commerce,
	)

	if errors.Is(err, services.ErrProductVariants) {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	// Trata alterações concorrentes.
	if errors.Is(err, repositories.ErrVariantConflict) {
		response.Error(w, http.StatusConflict, err.Error())
		return
	}

	if errors.Is(err, sql.ErrNoRows) {
		response.Error(w, http.StatusNotFound, "Produto não encontrado")
		return
	}

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Não foi possível salvar as variações")
		return
	}

	// Retorna as variantes atualizadas.
	response.JSON(w, http.StatusOK, map[string]any{
		"variants": items,
	})
}
