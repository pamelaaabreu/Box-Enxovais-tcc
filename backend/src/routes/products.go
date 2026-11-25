package routes

import (
	"backend/src/handlers"
	"backend/src/repositories"
	"net/http"
)

func InitRoutesProducts(mux *http.ServeMux, products handlers.ProductHandler, images handlers.ProductImageHandler) {
	for _, pattern := range []string{"GET /admin/products/{id}", "PATCH /admin/products/{id}", "DELETE /admin/products/{id}"} {
		adminRoute(mux, pattern, products.AdminProduct)
	}
	for _, pattern := range []string{"GET /admin/products/{id}/images", "PUT /admin/products/{id}/images", "DELETE /admin/products/{id}/images/{imageId}"} {
		adminRoute(mux, pattern, images.AdminImages)
	}
	adminRoute(mux, "PUT /admin/products/{id}/variants", products.SaveProductVariants)
	adminRoute(mux, "GET /admin/products", products.ListAdminProducts)
	// path: chave do tipo string, utilizada para montar a URL.
	// kind: valor do tipo CatalogKind, que identifica o tipo de cadastro.
	for path, kind := range map[string]repositories.CatalogKind{"categories": repositories.Categories, "brands": repositories.Brands} {
		base := "/admin/catalog/" + path
		// CatalogRegistrations retorna um handler configurado para categorias ou marcas.
		catalog := products.CatalogRegistrations(kind)
		for _, pattern := range []string{"GET " + base, "POST " + base, "PATCH " + base + "/{id}", "DELETE " + base + "/{id}"} {
			adminRoute(mux, pattern, catalog)
		}
	}
	adminRoute(mux, "GET /admin/products/brands", products.ListProductBrands)
	publicRoute(mux, "GET /products", products.ListProducts)
	publicRoute(mux, "GET /products/categories", products.ListProductTypes)
	adminRoute(mux, "POST /upload-image", images.UploadProductImage)
	adminRoute(mux, "POST /products", products.CreateProduct)
	publicRoute(mux, "GET /products/{id}/related", products.ListRelatedProducts)
	publicRoute(mux, "GET /products/{id}", products.GetProduct)
	publicRoute(mux, "GET /products/", products.GetProduct)
}
