package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"database/sql"
	"net/http"
)

type shippingRange = models.ShippingRange

func InitRoutesShipping(mux *http.ServeMux, database *sql.DB) {
	publicRoute(mux, http.MethodGet, "GET /shipping/quote", handlers.QuoteShipping(database))

	const base = "/admin/catalog/shipping-ranges"
	adminRoute(mux, http.MethodGet, "GET "+base, handlers.ListShippingRanges(database))
	adminRoute(mux, http.MethodPost, "POST "+base, handlers.SaveShippingRange(database))
	adminRoute(mux, http.MethodPatch, "PATCH "+base+"/{id}", handlers.SaveShippingRange(database))
	adminRoute(mux, http.MethodDelete, "DELETE "+base+"/{id}", handlers.DeleteShippingRange(database))
}
