package handlers

import (
	"backend/src/response"
	"net/http"
)

// Lista as marcas disponíveis.
func (h ProductHandler) ListProductBrands(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	brands, err := h.Service.ListBrands(r.Context())

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Erro ao buscar marcas")
		return
	}

	response.JSON(w, http.StatusOK, brands)
}

// Lista as categorias disponíveis.
func (h ProductHandler) ListProductTypes(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	types, err := h.Service.ListTypes(r.Context())

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Erro ao buscar categorias")
		return
	}

	response.JSON(w, http.StatusOK, types)
}
