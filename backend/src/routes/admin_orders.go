package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesAdminOrders(mux *http.ServeMux, adminOrders handlers.AdminOrdersHandler) {
	for _, pattern := range []string{
		"GET /admin/orders",
		"GET /admin/orders/{id}",
		"POST /admin/orders/{id}/cancel",
	} {
		adminRoute(mux, pattern, adminOrders.ServeHTTP)
	}
}
