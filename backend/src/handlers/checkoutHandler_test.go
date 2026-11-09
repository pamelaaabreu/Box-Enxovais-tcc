package handlers

import (
	middlewares "backend/src/middleware"
	"backend/src/models"
	"context"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type checkoutStoreStub struct{ order models.CheckoutOrder }

func (s *checkoutStoreStub) Create(_ context.Context, _ int, _ models.CheckoutRequest) (models.CheckoutOrder, error) {
	if s.order.ID != 0 {
		return s.order, nil
	}
	s.order = models.CheckoutOrder{ID: 7, Total: 2500, Status: "simulated_approved"}
	created := s.order
	created.ReceiptItems = []models.CartItem{{Name: "Produto teste", Quantity: 1, UnitPrice: 2500}}
	return created, nil
}

func (s *checkoutStoreStub) Get(_ context.Context, userID int, id int64) (models.CheckoutOrder, error) {
	if userID != 1 || id != s.order.ID {
		return models.CheckoutOrder{}, sql.ErrNoRows
	}
	return s.order, nil
}

func TestCheckoutReceiptOnlyOnNewOrder(t *testing.T) {
	const secret = "checkout-test-secret"
	t.Setenv("JWT_SECRET", secret)
	store := &checkoutStoreStub{}
	sends := 0
	h := CheckoutHandler{Store: store, Notify: func(userID int, order models.CheckoutOrder) {
		sends++
		if userID != 1 || order.ID != store.order.ID {
			t.Fatal("wrong notification owner or order")
		}
		// Delivery failures stay inside the notifier and cannot change the order response.
	}}
	mux := http.NewServeMux()
	mux.HandleFunc("POST /checkout", middlewares.AuthMiddleware(h.ServeHTTP))
	mux.HandleFunc("GET /checkout/success/{id}", middlewares.AuthMiddleware(h.ServeHTTP))
	const body = `{"requestKey":"test-checkout-0001","address":{"recipient":"Teste","zipCode":"01001000","street":"Rua Teste","number":"1","neighborhood":"Centro","city":"São Paulo","state":"SP"},"paymentMethod":"pix","expectedTotalCents":2500}`
	call := func(method, path string, user, expected int) {
		t.Helper()
		token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, models.Claims{UserID: user, Role: "customer", RegisteredClaims: jwt.RegisteredClaims{Issuer: "box-enxovais-api", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}}).SignedString([]byte(secret))
		if err != nil {
			t.Fatal(err)
		}
		r := httptest.NewRequest(method, path, strings.NewReader(body))
		r.Header.Set("Authorization", "Bearer "+token)
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		if w.Code != expected || !json.Valid(w.Body.Bytes()) {
			t.Fatalf("status %d, expected %d", w.Code, expected)
		}
	}
	call("POST", "/checkout", 1, 200)
	call("POST", "/checkout", 1, 200)
	call("GET", "/checkout/success/7", 1, 200)
	call("GET", "/checkout/success/7", 2, 404)
	if sends != 1 {
		t.Fatalf("sent %d notifications, expected 1", sends)
	}
}
