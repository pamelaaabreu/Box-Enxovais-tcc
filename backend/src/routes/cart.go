package routes

import (
	"backend/src/handlers"
	middlewares "backend/src/middleware"
	"net/http"
)

func InitRoutesCart(mux *http.ServeMux, cart handlers.CartHandler) {
	for _, pattern := range []string{"GET /cart", "POST /cart/items", "PATCH /cart/items/{id}", "DELETE /cart/items/{id}", "DELETE /cart"} {
		mux.HandleFunc(pattern, middlewares.AuthMiddleware(cart.ServeHTTP))
	}
}
