package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesAdminCustomers(mux *http.ServeMux, h handlers.AdminCustomerHandler) {
	adminRoute(mux, http.MethodGet, "GET /admin/customers", h.ServeHTTP)
	adminRoute(mux, http.MethodGet, "GET /admin/customers/{id}", h.ServeHTTP)
	adminRoute(mux, http.MethodGet, "GET /admin/customers/{id}/orders", h.ServeHTTP)
}
