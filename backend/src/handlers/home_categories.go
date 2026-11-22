package handlers

import (
	"backend/src/response"
	"net/http"
)

func (h HomeHandler) Categories(w http.ResponseWriter, r *http.Request) {
	v, e := h.Store.Categories(r.Context())
	if e != nil {
		response.Error(w, 500, "Não foi possível carregar as categorias.")
		return
	}
	response.JSON(w, 200, v)
}
