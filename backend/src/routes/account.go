package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesAccount(mux *http.ServeMux, account handlers.AccountHandler) {
	for _, pattern := range []string{
		"GET /me",
		"PATCH /me",
		"GET /me/addresses",
		"POST /me/addresses",
		"PATCH /me/addresses/{id}",
		"DELETE /me/addresses/{id}",
		"PUT /me/addresses/{id}/default",
	} {
		authenticatedRoute(mux, pattern, account.ServeHTTP)
	}
}
