package routes

import (
	"backend/src/handlers"
	"backend/src/repositories"
	"net/http"
)

func InitRoutesProducts(mux *http.ServeMux, products handlers.ProductHandler, images handlers.ProductImageHandler) {
	adminRoute(mux, http.MethodGet, "GET /admin/products", products.ListAdminProducts)
	for path, kind := range map[string]repositories.CatalogKind{"categories": repositories.Categories, "brands": repositories.Brands} {
		base := "/admin/catalog/" + path
		handler := products.CatalogRegistrations(kind)
		adminRoute(mux, http.MethodGet, "GET "+base, handler)
		adminRoute(mux, http.MethodPost, "POST "+base, handler)
		adminRoute(mux, http.MethodPatch, "PATCH "+base+"/{id}", handler)
		adminRoute(mux, http.MethodDelete, "DELETE "+base+"/{id}", handler)
	}
	adminRoute(mux, http.MethodGet, "GET /admin/products/brands", products.ListProductBrands)
	adminRoute(mux, http.MethodGet, "GET /admin/dashboard", products.GetDashboard)
	publicRoute(mux, http.MethodGet, "GET /products", products.ListProducts)
	publicRoute(mux, http.MethodGet, "GET /products/categories", products.ListProductTypes)
	adminRoute(mux, http.MethodPost, "/upload-image", images.UploadProductImage)
	adminRoute(mux, http.MethodPost, "/products", products.CreateProduct)
	publicRoute(mux, http.MethodGet, "/products/", products.GetProduct)
}
