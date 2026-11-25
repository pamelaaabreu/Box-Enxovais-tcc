package handlers

import (
	"backend/src/response"
	"net/http"
	"strconv"
)

// Consulta a campanha destacada na Home.
func (h HomeHandler) Campaign(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	w.Header().Set("Cache-Control", "no-store")

	campaign, err := h.Store.Campaign(r.Context())

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Não foi possível carregar a campanha.")
		return
	}

	response.JSON(w, http.StatusOK, campaign)
}

// Consulta uma campanha específica.
func (h HomeHandler) CampaignDetail(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	w.Header().Set("Cache-Control", "no-store")

	// Valida o identificador da campanha.
	id, err := strconv.Atoi(r.PathValue("id"))

	if err != nil || id <= 0 {
		response.Error(w, http.StatusNotFound, "Campanha não encontrada.")
		return
	}

	campaign, err := h.Store.CampaignByID(r.Context(), id)

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Não foi possível carregar a campanha.")
		return
	}

	// Verifica se a campanha está disponível.
	if campaign == nil {
		response.Error(w, http.StatusNotFound, "Esta campanha não está disponível.")
		return
	}

	response.JSON(w, http.StatusOK, campaign)
}
