package middlewares

import (
	"backend/src/response"
	"net/http"
	"strings"
)

const roleAdmin = "admin"

// Verifica se o usuário logado é ADMIN
func AdminMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		role, ok := GetRoleFromContext(r.Context())
		if !ok {
			response.Error(w, http.StatusUnauthorized, "Usuário não autenticado")
			return
		}

		role = strings.ToLower(strings.TrimSpace(role))

		if role != roleAdmin {
			response.Error(w, http.StatusForbidden, "Acesso permitido apenas para administradores")
			return
		}

		next.ServeHTTP(w, r)
	}
}
