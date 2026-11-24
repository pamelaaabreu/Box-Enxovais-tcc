package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesHome(mux *http.ServeMux, home handlers.HomeHandler) {
	publicRoute(mux, "GET /home/highlights", home.Highlights)
	publicRoute(mux, "GET /home/featured", home.Featured)
	publicRoute(mux, "GET /home/categories", home.Categories)
	publicRoute(mux, "GET /home/campaign", home.Campaign)
	publicRoute(mux, "GET /campaigns/{id}", home.CampaignDetail)
}
