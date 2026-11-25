package handlers

import (
	"backend/src/response"
	"net/http"
)

func (h HomeHandler) Categories(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	// Recupera as categorias e suas imagens representativas.
	categories, err := h.Store.Categories(r.Context())

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Não foi possível carregar as categorias.")
		return
	}

	response.JSON(w, http.StatusOK, categories)
}
