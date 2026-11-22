package handlers

import (
	"backend/src/response"
	"net/http"
	"strconv"
)

func (h HomeHandler) Campaign(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	c, e := h.Store.Campaign(r.Context())
	if e != nil {
		response.Error(w, 500, "Não foi possível carregar a campanha.")
		return
	}
	response.JSON(w, 200, c)
}

func (h HomeHandler) CampaignDetail(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id <= 0 {
		response.Error(w, 404, "Campanha não encontrada.")
		return
	}
	campaign, err := h.Store.CampaignByID(r.Context(), id)
	if err != nil {
		response.Error(w, 500, "Não foi possível carregar a campanha.")
		return
	}
	if campaign == nil {
		response.Error(w, 404, "Esta campanha não está disponível.")
		return
	}
	response.JSON(w, 200, campaign)
}
