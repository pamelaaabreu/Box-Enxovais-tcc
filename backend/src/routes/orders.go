package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesOrders(mux *http.ServeMux, orders handlers.OrderHistoryHandler) {
	for _, pattern := range []string{
		"GET /orders",
		"GET /orders/{id}",
		"POST /orders/{id}/cancel",
	} {
		authenticatedRoute(mux, pattern, orders.ServeHTTP)
	}
}
