package handlers

import (
	"backend/src/response"
	"net/http"
)

func (h ProductHandler) ListProductBrands(w http.ResponseWriter, r *http.Request) {
	brands, err := h.Service.Store.ListBrands(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Erro ao buscar marcas")
		return
	}
	response.JSON(w, http.StatusOK, brands)
}

func (h ProductHandler) ListProductTypes(w http.ResponseWriter, r *http.Request) {
	types, err := h.Service.ListTypes(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Erro ao buscar categorias")
		return
	}
	response.JSON(w, http.StatusOK, types)
}
