package middlewares

import (
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"backend/src/models"

	"github.com/golang-jwt/jwt/v5"
)

const jwtTestSecret = "test-only-jwt-secret-never-use-in-production"

func signedTestJWT(t *testing.T, secret string, method jwt.SigningMethod, userID int, role string, expiresAt *time.Time, issuer string) string {
	t.Helper()

	claims := models.Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:   issuer,
			IssuedAt: jwt.NewNumericDate(time.Now().Add(-time.Minute)),
		},
	}
	if expiresAt != nil {
		claims.ExpiresAt = jwt.NewNumericDate(*expiresAt)
	}

	token, err := jwt.NewWithClaims(method, claims).SignedString([]byte(secret))
	if err != nil {
		t.Fatalf("não foi possível assinar JWT de teste: %v", err)
	}
	return token
}

func runProtectedRequest(token string, requireAdmin bool) (int, bool, int, string) {
	called := false
	var userID int
	var role string

	handler := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		called = true
		userID, _ = GetUserIDFromContext(r.Context())
		role, _ = GetRoleFromContext(r.Context())
		w.WriteHeader(http.StatusNoContent)
	})

	if requireAdmin {
		handler = AdminMiddleware(handler)
	}
	handler = AuthMiddleware(handler)

	req := httptest.NewRequest(http.MethodGet, "/protected", nil)
	if token != "" {
		req.Header.Set("Authorization", "Bearer "+token)
	}

	res := httptest.NewRecorder()
	handler.ServeHTTP(res, req)
	return res.Code, called, userID, role
}

func TestAuthMiddlewareJWTSecurity(t *testing.T) {
	t.Setenv("JWT_SECRET", jwtTestSecret)

	now := time.Now()
	validExpiry := now.Add(time.Minute)
	expired := now.Add(-time.Minute)

	valid := signedTestJWT(t, jwtTestSecret, jwt.SigningMethodHS256, 42, "customer", &validExpiry, jwtIssuer)
	expiredToken := signedTestJWT(t, jwtTestSecret, jwt.SigningMethodHS256, 42, "customer", &expired, jwtIssuer)
	missingExpiry := signedTestJWT(t, jwtTestSecret, jwt.SigningMethodHS256, 42, "customer", nil, jwtIssuer)
	otherIssuer := signedTestJWT(t, jwtTestSecret, jwt.SigningMethodHS256, 42, "customer", &validExpiry, "not-box-enxovais")
	wrongSecret := signedTestJWT(t, "different-secret", jwt.SigningMethodHS256, 42, "admin", &validExpiry, jwtIssuer)
	wrongAlgorithm := signedTestJWT(t, jwtTestSecret, jwt.SigningMethodHS384, 42, "customer", &validExpiry, jwtIssuer)
	missingUser := signedTestJWT(t, jwtTestSecret, jwt.SigningMethodHS256, 0, "customer", &validExpiry, jwtIssuer)
	missingRole := signedTestJWT(t, jwtTestSecret, jwt.SigningMethodHS256, 42, "", &validExpiry, jwtIssuer)

	// Altera o payload de um JWT assinado, sem recalcular a assinatura.
	parts := strings.Split(valid, ".")
	if len(parts) != 3 {
		t.Fatal("JWT de teste malformado")
	}
	payload := parts[1]
	replacement := "A"
	if payload[0] == 'A' {
		replacement = "B"
	}
	tampered := parts[0] + "." + replacement + payload[1:] + "." + parts[2]

	tests := []struct {
		name   string
		token  string
		status int
		called bool
	}{
		{"válido", valid, http.StatusNoContent, true},
		{"sem token", "", http.StatusUnauthorized, false},
		{"expirado", expiredToken, http.StatusUnauthorized, false},
		{"sem expiração", missingExpiry, http.StatusUnauthorized, false},
		{"emissor incorreto", otherIssuer, http.StatusUnauthorized, false},
		{"assinatura de outra chave", wrongSecret, http.StatusUnauthorized, false},
		{"payload adulterado", tampered, http.StatusUnauthorized, false},
		{"algoritmo HS384 não permitido", wrongAlgorithm, http.StatusUnauthorized, false},
		{"id de usuário ausente", missingUser, http.StatusUnauthorized, false},
		{"papel ausente", missingRole, http.StatusUnauthorized, false},
		{"token malformado", "not-a-jwt", http.StatusUnauthorized, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status, called, id, role := runProtectedRequest(tt.token, false)
			if status != tt.status {
				t.Errorf("HTTP = %d; esperado %d", status, tt.status)
			}
			if called != tt.called {
				t.Errorf("handler chamado = %v; esperado %v", called, tt.called)
			}
			if tt.called && (id != 42 || role != "customer") {
				t.Errorf("contexto autenticado = (id=%d, role=%q); esperado (42, customer)", id, role)
			}
		})
	}
}

func TestAdminMiddlewareJWTAuthorization(t *testing.T) {
	t.Setenv("JWT_SECRET", jwtTestSecret)
	expiry := time.Now().Add(time.Minute)

	adminToken := signedTestJWT(t, jwtTestSecret, jwt.SigningMethodHS256, 2, "admin", &expiry, jwtIssuer)
	clientToken := signedTestJWT(t, jwtTestSecret, jwt.SigningMethodHS256, 3, "customer", &expiry, jwtIssuer)
	forgedAdminToken := signedTestJWT(t, "wrong-secret", jwt.SigningMethodHS256, 3, "admin", &expiry, jwtIssuer)

	tests := []struct {
		name   string
		token  string
		status int
		called bool
	}{
		{"administrador autorizado", adminToken, http.StatusNoContent, true},
		{"cliente proibido", clientToken, http.StatusForbidden, false},
		{"admin forjado com assinatura inválida", forgedAdminToken, http.StatusUnauthorized, false},
		{"sem autenticação", "", http.StatusUnauthorized, false},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			status, called, _, _ := runProtectedRequest(tt.token, true)
			if status != tt.status || called != tt.called {
				t.Errorf("status=%d, chamado=%v; esperado status=%d, chamado=%v", status, called, tt.status, tt.called)
			}
		})
	}
}

func TestAuthMiddlewareMissingJWTSecret(t *testing.T) {
	t.Setenv("JWT_SECRET", "")
	expiry := time.Now().Add(time.Minute)
	token := signedTestJWT(t, jwtTestSecret, jwt.SigningMethodHS256, 1, "customer", &expiry, jwtIssuer)
	status, called, _, _ := runProtectedRequest(token, false)

	if status != http.StatusInternalServerError || called {
		t.Fatalf("configuração sem JWT_SECRET: status=%d, chamado=%v", status, called)
	}
}
