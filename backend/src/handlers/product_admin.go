package handlers

import (
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/response"
	"backend/src/services"
	"database/sql"
	"encoding/json"
	"errors"
	"github.com/lib/pq"
	"io"
	"net/http"
	"strconv"
)

func productID(r *http.Request) (int64, error) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err == nil && id <= 0 {
		err = strconv.ErrSyntax
	}
	return id, err
}
func adminProductError(w http.ResponseWriter, err error) {
	var pg *pq.Error
	switch {
	case errors.Is(err, sql.ErrNoRows):
		response.Error(w, 404, "Produto ou imagem não encontrado.")
	case errors.Is(err, repositories.ErrProductConflict), errors.Is(err, repositories.ErrVariantConflict), errors.Is(err, repositories.ErrImageConflict):
		response.Error(w, 409, err.Error())
	case errors.Is(err, services.ErrProductDetails), errors.Is(err, services.ErrProductVariants):
		response.Error(w, 400, err.Error())
	case errors.As(err, &pg) && (pg.Code == "23503" || pg.Code == "23505" || pg.Code == "23514"):
		response.Error(w, 409, "Há vínculos ou dados incompatíveis. Recarregue o produto e revise as informações.")
	default:
		response.Error(w, 500, "Não foi possível concluir a operação. Tente novamente.")
	}
}
func decodeProductRequest(w http.ResponseWriter, r *http.Request, target any) bool {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 2<<20))
	decoder.DisallowUnknownFields()
	if decoder.Decode(target) != nil || decoder.Decode(new(any)) != io.EOF {
		response.Error(w, 400, "Dados inválidos. Envie somente os campos editáveis do produto.")
		return false
	}
	return true
}
func (h ProductHandler) AdminProduct(w http.ResponseWriter, r *http.Request) {
	id, err := productID(r)
	if err != nil {
		response.Error(w, 400, "Produto inválido.")
		return
	}
	switch r.Method {
	case http.MethodGet:
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
		response.JSON(w, 200, products[0])
	case http.MethodPatch:
		var request models.ProductUpdateRequest
		if !decodeProductRequest(w, r, &request) {
			return
		}
		if err = h.Service.Update(r.Context(), id, request); err != nil {
			adminProductError(w, err)
			return
		}
		products, err := h.Service.Get(r.Context(), id)
		if err != nil {
			adminProductError(w, err)
			return
		}
		response.JSON(w, 200, products[0])
	case http.MethodDelete:
		action, err := h.Service.Store.Remove(r.Context(), id)
		if err != nil {
			adminProductError(w, err)
			return
		}
		response.JSON(w, 200, map[string]string{"action": action})
	}
}
