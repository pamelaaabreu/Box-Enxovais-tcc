package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"encoding/json"
	"fmt"
	"github.com/golang-jwt/jwt/v5"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"
)

func TestShippingRangesPostgres(t *testing.T) {
	db, exec := checkoutTestDB(t)
	exec("DROP TABLE shipping_ranges")
	migration, err := os.ReadFile("../../migrations/000012_shipping_ranges.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	exec(string(migration))
	mux := http.NewServeMux()
	InitRoutesShipping(mux, handlers.QuoteShipping(db), handlers.ListShippingRanges(db), handlers.SaveShippingRange(db), handlers.DeleteShippingRange(db))
	const secret = "shipping-test-secret"
	const path = "/admin/catalog/shipping-ranges"
	t.Setenv("JWT_SECRET", secret)
	call := func(method, path, role, body string, want int) []byte {
		t.Helper()
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		if role != "" {
			token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, models.Claims{UserID: 1, Role: role, RegisteredClaims: jwt.RegisteredClaims{Issuer: "box-enxovais-api", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Minute))}}).SignedString([]byte(secret))
			if err != nil {
				t.Fatal(err)
			}
			req.Header.Set("Authorization", "Bearer "+token)
		}
		res := httptest.NewRecorder()
		mux.ServeHTTP(res, req)
		if res.Code != want {
			t.Fatalf("%s %s: got %d, want %d: %s", method, path, res.Code, want, res.Body.String())
		}
		return res.Body.Bytes()
	}
	active := `{"name":"Região teste","startCep":"01000-000","endCep":"01000999","priceCents":1590,"minDays":3,"maxDays":5,"active":true}`
	call("GET", path, "", "", 401)
	call("POST", path, "customer", active, 403)
	call("POST", path, "admin", strings.Replace(active, "1590", "-1", 1), 400)
	var item models.ShippingRange
	if err = json.Unmarshal(call("POST", path, "admin", active, 201), &item); err != nil || item.ID <= 0 {
		t.Fatal(item, err)
	}
	target := fmt.Sprintf("%s/%d", path, item.ID)
	call("GET", path, "admin", "", 200)
	call("POST", path, "admin", active, 409)
	for _, cep := range []string{"01000-000", "01000999"} {
		got := string(call("GET", "/shipping/quote?cep="+cep, "", "", 200))
		for _, expected := range []string{`"priceCents":1590`, `"minDays":3`, `"maxDays":5`} {
			if !strings.Contains(got, expected) {
				t.Fatalf("unexpected quote: %s", got)
			}
		}
	}
	call("GET", "/shipping/quote?cep=123", "", "", 400)
	call("PATCH", target, "admin", strings.Replace(active, "true", "false", 1), 200)
	call("GET", "/shipping/quote?cep=01000001", "", "", 404)
	call("PATCH", target, "admin", strings.Replace(active, "1590", "2000", 1), 200)
	if got := string(call("GET", "/shipping/quote?cep=01000001", "", "", 200)); !strings.Contains(got, `"priceCents":2000`) {
		t.Fatal(got)
	}
	call("DELETE", target, "admin", "", 204)
	call("GET", "/shipping/quote?cep=01000001", "", "", 404)
}
