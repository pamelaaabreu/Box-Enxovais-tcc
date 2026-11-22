package handlers

import (
	"backend/src/response"
	"net/http"
)

func (h HomeHandler) Highlights(w http.ResponseWriter, r *http.Request) {
	p, s, e := h.Store.Highlights(r.Context())
	if e != nil {
		response.Error(w, 500, "Não foi possível carregar os destaques.")
		return
	}
	response.JSON(w, 200, map[string]any{"products": p, "bestSellers": s})
}

func (h HomeHandler) Featured(w http.ResponseWriter, r *http.Request) {
	products, err := h.Store.Featured(r.Context())
	if err != nil {
		response.Error(w, 500, "Não foi possível carregar os destaques.")
		return
	}
	response.JSON(w, 200, map[string]any{"products": products})
}
