package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesReports(mux *http.ServeMux, products handlers.ProductHandler) {
	for _, kind := range []string{"sales", "products", "customers", "stock"} {
		// false: consulta dos dados do relatório; true: exportação dos dados do relatório.
		adminRoute(mux, "GET /admin/reports/"+kind, products.Report(kind, false))
		{
			adminRoute(mux, "GET /admin/reports/"+kind+"/export", products.Report(kind, true))
		}
	}
}
