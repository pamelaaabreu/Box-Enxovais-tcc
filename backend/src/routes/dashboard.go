package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesDashboard(mux *http.ServeMux, products handlers.ProductHandler) {
	adminRoute(mux, "GET /admin/dashboard", products.GetDashboard)
}
