package middlewares

import (
	"backend/src/response"
	"net/http"
)

func Method(method string, next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		if r.Method != method {
			w.Header().Set("Allow", method)
			response.Error(w, http.StatusMethodNotAllowed, "Método não permitido")
			return
		}
		next(w, r)
	}
}
