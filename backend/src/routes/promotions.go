package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesPromotions(mux *http.ServeMux, promotions handlers.PromotionHandler, products handlers.ProductHandler) {
	adminRoute(mux, http.MethodPost, "/api/promotions/create", promotions.CreatePromotion)
	adminRoute(mux, http.MethodPost, "/api/promotions/add", promotions.AddProductToPromotion)
	publicRoute(mux, http.MethodGet, "/api/promotions/", products.GetPromotionalProducts)
}
