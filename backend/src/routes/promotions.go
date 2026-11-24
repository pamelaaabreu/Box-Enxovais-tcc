package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesPromotions(mux *http.ServeMux, promotions handlers.PromotionHandler, products handlers.ProductHandler) {
	adminRoute(mux, "POST /api/promotions/create", promotions.CreatePromotion)
	adminRoute(mux, "GET /admin/promotions", promotions.List)
	adminRoute(mux, "POST /admin/promotions/image", promotions.UploadImage)
	adminRoute(mux, "PUT /admin/promotions/{id}", promotions.Update)
	adminRoute(mux, "POST /api/promotions/add", promotions.AddProductToPromotion)
	publicRoute(mux, "GET /api/promotions/", products.GetPromotionalProducts)
}
