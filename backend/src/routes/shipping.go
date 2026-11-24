package routes

import "net/http"

// Os handlers são preparados na composição da aplicação; rotas não montam acesso ao banco.
func InitRoutesShipping(mux *http.ServeMux, quoteShipping, listShippingRanges, saveShippingRange, deleteShippingRange http.HandlerFunc) {
	publicRoute(mux, "GET /shipping/quote", quoteShipping)
	const base = "/admin/catalog/shipping-ranges"
	adminRoute(mux, "GET "+base, listShippingRanges)
	for _, pattern := range []string{"POST " + base, "PATCH " + base + "/{id}"} {
		adminRoute(mux, pattern, saveShippingRange)
	}
	adminRoute(mux, "DELETE "+base+"/{id}", deleteShippingRange)
}
