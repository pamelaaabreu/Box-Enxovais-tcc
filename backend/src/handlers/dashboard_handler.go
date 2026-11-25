package handlers

import (
	"backend/src/response"
	"net/http"
	"time"
)

// Recebe a solicitação dos indicadores administrativos.
func (h ProductHandler) GetDashboard(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	w.Header().Set("Cache-Control", "no-store")

	period, err := dashboardPeriod(r, time.Now())

	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	// Recupera os indicadores calculados pelo repository.
	dashboard, err := h.Service.Dashboard(
		r.Context(),
		period,
	)

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Não foi possível carregar os indicadores. Tente novamente.")
		return
	}

	response.JSON(w, http.StatusOK, dashboard)
}
