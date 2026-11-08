package routes

import (
	middlewares "backend/src/middleware"
	"net/http"
)

func publicRoute(mux *http.ServeMux, method, path string, handler http.HandlerFunc) {
	mux.HandleFunc(path, middlewares.Method(method, handler))
}

func adminRoute(mux *http.ServeMux, method, path string, handler http.HandlerFunc) {
	protectedHandler := middlewares.AuthMiddleware(
		middlewares.AdminMiddleware(handler),
	)

	mux.HandleFunc(path, middlewares.Method(method, protectedHandler))
}
