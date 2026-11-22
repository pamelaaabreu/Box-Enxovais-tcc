package handlers

import (
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/response"
	"backend/src/services"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
)

func (h ProductHandler) SaveProductVariants(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, 400, "Produto inválido")
		return
	}
	var body struct {
		Variants []models.ProductVariant       `json:"variants"`
		Expected *[]models.ProductVariant      `json:"expected_variants"`
		Commerce *models.ProductCommerceChange `json:"commerce,omitempty"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 128<<10))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&body) != nil || decoder.Decode(&struct{}{}) != io.EOF || body.Expected == nil {
		response.Error(w, 400, "Informe as variações e recarregue os dados do produto")
		return
	}
	items, err := h.Service.SaveVariants(r.Context(), id, body.Variants, *body.Expected, body.Commerce)
	if errors.Is(err, services.ErrProductVariants) {
		response.Error(w, 400, err.Error())
		return
	}
	if errors.Is(err, repositories.ErrVariantConflict) {
		response.Error(w, 409, err.Error())
		return
	}
	if errors.Is(err, sql.ErrNoRows) {
		response.Error(w, 404, "Produto não encontrado")
		return
	}
	if err != nil {
		response.Error(w, 500, "Não foi possível salvar as variações")
		return
	}
	response.JSON(w, 200, map[string]any{"variants": items})
}
