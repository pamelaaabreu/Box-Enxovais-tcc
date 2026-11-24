package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesCheckout(mux *http.ServeMux, checkout handlers.CheckoutHandler) {
	for _, pattern := range []string{
		"POST /checkout",
		"GET /checkout/success/{id}",
	} {
		authenticatedRoute(mux, pattern, checkout.ServeHTTP)
	}
}
