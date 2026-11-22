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
	jwtIssuer                   = "box-enxovais-api"
)

func AuthMiddleware(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
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

		claims := &models.Claims{}

		token, err := jwt.ParseWithClaims(
			tokenString,
			claims,
			func(token *jwt.Token) (any, error) {
				return []byte(jwtSecret), nil
			},
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

		ctx := context.WithValue(r.Context(), contextKeyUserID, claims.UserID)
		ctx = context.WithValue(ctx, contextKeyRole, claims.Role)

		next.ServeHTTP(w, r.WithContext(ctx))
	}
}

func extractBearerToken(r *http.Request) (string, bool) {
	authHeader := strings.TrimSpace(r.Header.Get("Authorization"))
	if authHeader == "" {
		return "", false
	}

	parts := strings.Fields(authHeader)
	if len(parts) != 2 {
		return "", false
	}

	if !strings.EqualFold(parts[0], "Bearer") {
		return "", false
	}

	tokenString := strings.TrimSpace(parts[1])
	if tokenString == "" {
		return "", false
	}

	return tokenString, true
}

func handleTokenError(w http.ResponseWriter, err error) {
	if errors.Is(err, jwt.ErrTokenExpired) {
		response.Error(w, http.StatusUnauthorized, "Token expirado")
		return
	}

	response.Error(w, http.StatusUnauthorized, "Token inválido")
}

func GetUserIDFromContext(ctx context.Context) (int, bool) {
	userID, ok := ctx.Value(contextKeyUserID).(int)
	return userID, ok
}

func GetRoleFromContext(ctx context.Context) (string, bool) {
	role, ok := ctx.Value(contextKeyRole).(string)
	return role, ok
}
