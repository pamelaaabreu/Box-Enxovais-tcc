package routes

import (
	"backend/src/handlers"
	middlewares "backend/src/middleware"
	"net/http"
)

func InitRoutesFavorites(mux *http.ServeMux, favorites handlers.FavoritesHandler) {
	for _, pattern := range []string{"GET /favorites", "PUT /favorites/{productId}", "DELETE /favorites/{productId}"} {
		mux.HandleFunc(pattern, middlewares.AuthMiddleware(favorites.ServeHTTP))
	}
}
