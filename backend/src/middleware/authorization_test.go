package middlewares

import (
	"backend/src/models"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

const testJWTSecret = "test-secret-with-enough-entropy"

func TestAdminAuthorization(t *testing.T) {
	t.Setenv("JWT_SECRET", testJWTSecret)

	tests := []struct {
		name       string
		token      string
		wantStatus int
	}{
		{name: "missing token", wantStatus: http.StatusUnauthorized},
		{name: "invalid token", token: "invalid", wantStatus: http.StatusUnauthorized},
		{name: "token without user", token: signedTestTokenWithUser(t, 0, "admin", time.Now().Add(time.Hour)), wantStatus: http.StatusUnauthorized},
		{name: "expired token", token: signedTestToken(t, "admin", time.Now().Add(-time.Hour)), wantStatus: http.StatusUnauthorized},
		{name: "authenticated customer", token: signedTestToken(t, "customer", time.Now().Add(time.Hour)), wantStatus: http.StatusForbidden},
		{name: "authenticated admin", token: signedTestToken(t, "admin", time.Now().Add(time.Hour)), wantStatus: http.StatusNoContent},
	}

	handler := AuthMiddleware(AdminMiddleware(func(w http.ResponseWriter, r *http.Request) {
		if _, ok := GetUserIDFromContext(r.Context()); !ok {
			t.Error("authenticated user ID was not added to the request context")
		}
		w.WriteHeader(http.StatusNoContent)
	}))

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			req := httptest.NewRequest(http.MethodPost, "/admin-resource", nil)
			if tt.token != "" {
				req.Header.Set("Authorization", "Bearer "+tt.token)
			}

			res := httptest.NewRecorder()
			handler(res, req)

			if res.Code != tt.wantStatus {
				t.Fatalf("status = %d; want %d", res.Code, tt.wantStatus)
			}
		})
	}
}

func TestMethodMiddleware(t *testing.T) {
	handler := Method(http.MethodPost, func(w http.ResponseWriter, r *http.Request) {
		w.WriteHeader(http.StatusNoContent)
	})

	req := httptest.NewRequest(http.MethodGet, "/resource", nil)
	res := httptest.NewRecorder()
	handler(res, req)

	if res.Code != http.StatusMethodNotAllowed {
		t.Fatalf("status = %d; want %d", res.Code, http.StatusMethodNotAllowed)
	}
	if allow := res.Header().Get("Allow"); allow != http.MethodPost {
		t.Fatalf("Allow header = %q; want %q", allow, http.MethodPost)
	}
}

func signedTestToken(t *testing.T, role string, expiresAt time.Time) string {
	return signedTestTokenWithUser(t, 1, role, expiresAt)
}

func signedTestTokenWithUser(t *testing.T, userID int, role string, expiresAt time.Time) string {
	t.Helper()

	claims := models.Claims{
		UserID: userID,
		Role:   role,
		RegisteredClaims: jwt.RegisteredClaims{
			Issuer:    jwtIssuer,
			ExpiresAt: jwt.NewNumericDate(expiresAt),
		},
	}

	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, claims).SignedString([]byte(testJWTSecret))
	if err != nil {
		t.Fatalf("could not sign test token: %v", err)
	}

	return token
}
