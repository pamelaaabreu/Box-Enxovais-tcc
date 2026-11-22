package handlers

import (
	"backend/src/response"
	"log"
	"net/http"
	"strconv"
	"strings"
)

func (h ProductHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(strings.TrimPrefix(r.URL.Path, "/products/"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, 400, "ID inválido")
		return
	}
	products, err := h.Service.Get(r.Context(), id)
	if err != nil {
		response.Error(w, 500, "Erro ao buscar produto")
		return
	}
	if len(products) == 0 {
		response.Error(w, 404, "Produto não encontrado")
		return
	}
	response.JSON(w, 200, products[0])
}

func (h ProductHandler) ListRelatedProducts(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, http.StatusBadRequest, "ID inválido")
		return
	}
	products, err := h.Service.Store.ListRelated(r.Context(), id)
	if err != nil {
		log.Printf("list related products: %v", err)
		response.Error(w, http.StatusInternalServerError, "Erro ao buscar produtos relacionados")
		return
	}
	response.JSON(w, http.StatusOK, products)
}
