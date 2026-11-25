package handlers

import (
	"backend/src/response"
	"net/http"
)

// Recupera os produtos mais vendidos ou o fallback.
func (h HomeHandler) Highlights(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	products, bestSellers, err := h.Store.Highlights(r.Context())

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Não foi possível carregar os destaques.")
		return
	}

	// Informa se os produtos são realmente os mais vendidos.
	response.JSON(w, http.StatusOK, map[string]any{
		"products":    products,
		"bestSellers": bestSellers,
	})
}

// Recupera os produtos selecionados como destaque.
func (h HomeHandler) Featured(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	products, err := h.Store.Featured(r.Context())

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Não foi possível carregar os destaques.")
		return
	}

	response.JSON(w, http.StatusOK, map[string]any{
		"products": products,
	})
}
