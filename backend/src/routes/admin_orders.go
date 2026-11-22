package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesAdminOrders(mux *http.ServeMux, handler handlers.AdminOrdersHandler) {
	adminRoute(mux, http.MethodGet, "GET /admin/orders", handler.ServeHTTP)
	adminRoute(mux, http.MethodGet, "GET /admin/orders/{id}", handler.ServeHTTP)
	adminRoute(mux, http.MethodPost, "POST /admin/orders/{id}/cancel", handler.ServeHTTP)
}
