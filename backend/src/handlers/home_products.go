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

	p, s, e := h.Store.Highlights(r.Context())

	if e != nil {
		response.Error(w, 500, "Não foi possível carregar os destaques.")
		return
	}

	// Informa se os produtos são realmente os mais vendidos.
	response.JSON(w, 200, map[string]any{
		"products":    p,
		"bestSellers": s,
	})
}

// Recupera os produtos selecionados como destaque.
func (h HomeHandler) Featured(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	products, err := h.Store.Featured(r.Context())

	if err != nil {
		response.Error(w, 500, "Não foi possível carregar os destaques.")
		return
	}

	response.JSON(w, 200, map[string]any{
		"products": products,
	})
}
