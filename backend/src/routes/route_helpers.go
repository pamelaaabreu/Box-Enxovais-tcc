package routes

import (
	middlewares "backend/src/middleware"
	"net/http"
	"strings"
)

func publicRoute(mux *http.ServeMux, pattern string, handler http.HandlerFunc) {
	// O ServeMux aceita HEAD em padrões GET. Handlers que despacham pelo
	// método devem executar a leitura, nunca interpretar HEAD como uma edição.
	if strings.HasPrefix(pattern, "GET ") {
		readHandler := handler
		handler = func(w http.ResponseWriter, r *http.Request) {
			if r.Method == http.MethodHead {
				request := r.Clone(r.Context())
				request.Method = http.MethodGet
				r = request
			}
			readHandler(w, r)
		}
	}
	mux.HandleFunc(pattern, handler)
}

func authenticatedRoute(mux *http.ServeMux, pattern string, handler http.HandlerFunc) {
	publicRoute(mux, pattern, func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Cache-Control", "no-store")
		middlewares.AuthMiddleware(handler)(w, r)
	})
}

func adminRoute(mux *http.ServeMux, pattern string, handler http.HandlerFunc) {
	// Autenticação ocorre antes da verificação da permissão administrativa.
	authenticatedRoute(mux, pattern, middlewares.AdminMiddleware(handler))
}
