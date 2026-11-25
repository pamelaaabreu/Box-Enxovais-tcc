package middlewares

import (
	"backend/src/models"
	"backend/src/response"
	"context"
	"errors"
	"net/http"
	"os"
	"strings"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const (
	contextKeyUserID contextKey = "userID"
	contextKeyRole   contextKey = "role"
	jwtIssuer                   = "box-enxovais-api" // emissor esperado pelo JWT.
)

func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		// extrai o token JWT do cabeçalho Authorization.
		tokenString, ok := extractBearerToken(r)
		if !ok {
			response.Error(w, http.StatusUnauthorized, "Token de autenticação não fornecido ou inválido")
			return
		}

		jwtSecret := strings.TrimSpace(os.Getenv("JWT_SECRET"))

		if jwtSecret == "" {
			response.Error(w, http.StatusInternalServerError, "Configuração de autenticação inválida")
			return
		}

		// informações contidas dentro do JWT
		claims := &models.Claims{}

		token, err := jwt.ParseWithClaims(
			tokenString,
			claims,
			func(token *jwt.Token) (any, error) {
				return []byte(jwtSecret), nil
			},
			// apenas tokens assinados por HS256 serão aceitos
			jwt.WithValidMethods([]string{jwt.SigningMethodHS256.Alg()}),
			jwt.WithIssuer(jwtIssuer),
		)

		if err != nil {
			handleTokenError(w, err)
			return
		}

		if !token.Valid {
			response.Error(w, http.StatusUnauthorized, "Token inválido")
			return
		}

		if claims.ExpiresAt == nil {
			response.Error(w, http.StatusUnauthorized, "Token sem data de expiração")
			return
		}

		if claims.UserID <= 0 || strings.TrimSpace(claims.Role) == "" {
			response.Error(w, http.StatusUnauthorized, "Token sem identificação de usuário válida")
			return
		}

		// cada chamada do WithValue cria um contexto derivado do anterior.
		ctx := context.WithValue(r.Context(), contextKeyUserID, claims.UserID)
		ctx = context.WithValue(ctx, contextKeyRole, claims.Role)

		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

func extractBearerToken(r *http.Request) (string, bool) {
	// Fields remove espaços externos e nunca produz elementos vazios.
	parts := strings.Fields(r.Header.Get("Authorization"))
	if len(parts) != 2 {
		return "", false
	}

	// valida o esquema Bearer, ignorando maiúsculas e minúsculas.
	if !strings.EqualFold(parts[0], "Bearer") {
		return "", false
	}

	return parts[1], true
}

func handleTokenError(w http.ResponseWriter, err error) {
	if errors.Is(err, jwt.ErrTokenExpired) {
		response.Error(w, http.StatusUnauthorized, "Token expirado")
		return
	}

	response.Error(w, http.StatusUnauthorized, "Token inválido")
}

// Recupera o ID do usuário autenticado armazenado no contexto,
// permitindo que os handlers identifiquem o usuário da requisição
func GetUserIDFromContext(ctx context.Context) (int, bool) {
	userID, ok := ctx.Value(contextKeyUserID).(int)
	return userID, ok
}

func GetRoleFromContext(ctx context.Context) (string, bool) {
	role, ok := ctx.Value(contextKeyRole).(string)
	return role, ok
}
