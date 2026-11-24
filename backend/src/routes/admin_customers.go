package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesAdminCustomers(mux *http.ServeMux, adminCustomers handlers.AdminCustomerHandler) {
	for _, pattern := range []string{
		"GET /admin/customers",
		"GET /admin/customers/{id}",
		"GET /admin/customers/{id}/orders",
	} {
		adminRoute(mux, pattern, adminCustomers.ServeHTTP)
	}
}
