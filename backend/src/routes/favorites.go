package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesFavorites(mux *http.ServeMux, favorites handlers.FavoritesHandler) {
	for _, pattern := range []string{
		"GET /favorites",
		"PUT /favorites/{productId}",
		"DELETE /favorites/{productId}",
	} {
		authenticatedRoute(mux, pattern, favorites.ServeHTTP)
	}
}
