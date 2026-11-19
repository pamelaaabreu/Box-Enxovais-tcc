package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesPromotions(mux *http.ServeMux, promotions handlers.PromotionHandler, products handlers.ProductHandler) {
	adminRoute(mux, http.MethodPost, "/api/promotions/create", promotions.CreatePromotion)
	adminRoute(mux, http.MethodGet, "/admin/promotions", promotions.List)
	adminRoute(mux, http.MethodPost, "/admin/promotions/image", promotions.UploadImage)
	adminRoute(mux, http.MethodPut, "/admin/promotions/{id}", promotions.Update)
	adminRoute(mux, http.MethodPost, "/api/promotions/add", promotions.AddProductToPromotion)
	publicRoute(mux, http.MethodGet, "/api/promotions/", products.GetPromotionalProducts)
}
