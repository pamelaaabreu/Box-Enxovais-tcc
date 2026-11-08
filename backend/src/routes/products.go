package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesProducts(mux *http.ServeMux, products handlers.ProductHandler, images handlers.ProductImageHandler) {
	adminRoute(mux, http.MethodGet, "GET /admin/products", products.ListAdminProducts)
	publicRoute(mux, http.MethodGet, "GET /products", products.ListProducts)
	adminRoute(mux, http.MethodPost, "/upload-image", images.UploadProductImage)
	adminRoute(mux, http.MethodPost, "/products", products.CreateProduct)
	publicRoute(mux, http.MethodGet, "/products/", products.GetProduct)
}
