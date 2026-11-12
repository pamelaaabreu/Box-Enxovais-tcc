package handlers

import (
	"backend/src/response"
	"net/http"
)

func (h ProductHandler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	dashboard, err := h.Service.Store.Dashboard(r.Context())
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Erro ao carregar a dashboard")
		return
	}
	response.JSON(w, http.StatusOK, dashboard)
}
