package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesCart(mux *http.ServeMux, cart handlers.CartHandler) {
	for _, pattern := range []string{
		"GET /cart",
		"POST /cart/items",
		"PATCH /cart/items/{id}",
		"DELETE /cart/items/{id}",
		"DELETE /cart",
		"POST /cart/orders/{orderID}",
	} {
		authenticatedRoute(mux, pattern, cart.ServeHTTP)
	}
}
