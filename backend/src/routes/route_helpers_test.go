package routes

import (
	"backend/src/handlers"
	middlewares "backend/src/middleware"
	"backend/src/models"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func routeToken(t *testing.T, role string) string {
	t.Helper()
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, models.Claims{
		UserID: 1, Role: role, RegisteredClaims: jwt.RegisteredClaims{
			Issuer: "box-enxovais-api", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}).SignedString([]byte("route-registration-test-only"))
	if err != nil {
		t.Fatal(err)
	}
	return token
}

func TestRouteHelpers(t *testing.T) {
	t.Setenv("JWT_SECRET", "route-registration-test-only")
	for _, registration := range []struct {
		name                string
		register            func(*http.ServeMux, string, http.HandlerFunc)
		anonymous, customer int
	}{
		{"public", publicRoute, 204, 204},
		{"authenticated", authenticatedRoute, 401, 204},
		{"admin", adminRoute, 401, 403},
	} {
		t.Run(registration.name, func(t *testing.T) {
			mux := http.NewServeMux()
			registration.register(mux, "PATCH /resource/{id}", func(w http.ResponseWriter, r *http.Request) {
				if r.PathValue("id") != "42" {
					t.Error("dynamic parameter lost")
				}
				if registration.name != "public" {
					if _, ok := middlewares.GetUserIDFromContext(r.Context()); !ok {
						t.Error("authentication context lost")
					}
				}
				w.WriteHeader(http.StatusNoContent)
			})
			for _, test := range []struct {
				role string
				want int
			}{
				{"", registration.anonymous}, {"customer", registration.customer}, {"admin", 204},
			} {
				request := httptest.NewRequest(http.MethodPatch, "/resource/42", nil)
				if test.role != "" {
					request.Header.Set("Authorization", "Bearer "+routeToken(t, test.role))
				}
				response := httptest.NewRecorder()
				mux.ServeHTTP(response, request)
				if response.Code != test.want {
					t.Fatalf("role %q: got %d, want %d", test.role, response.Code, test.want)
				}
			}
			request := httptest.NewRequest(http.MethodGet, "/resource/42", nil)
			response := httptest.NewRecorder()
			mux.ServeHTTP(response, request)
			if response.Code != 405 || response.Header().Get("Allow") != "PATCH" {
				t.Fatal("method routing/Allow changed")
			}
		})
	}
}

func TestAllRouteRegistrations(t *testing.T) {
	// Register real handlers without a database: matching and rejected authorization
	// must not call business logic. Duplicate/conflicting patterns panic here.
	mux := http.NewServeMux()
	products := handlers.ProductHandler{}
	home := handlers.HomeHandler{}
	InitRoutesAuth(mux, handlers.AuthHandler{}, handlers.UserHandler{})
	InitRoutesAccount(mux, handlers.AccountHandler{})
	InitRoutesCart(mux, handlers.CartHandler{})
	InitRoutesCheckout(mux, handlers.CheckoutHandler{})
	InitRoutesOrders(mux, handlers.OrderHistoryHandler{})
	InitRoutesFavorites(mux, handlers.FavoritesHandler{})
	InitRoutesProducts(mux, products, handlers.ProductImageHandler{})
	InitRoutesDashboard(mux, products)
	InitRoutesReports(mux, products)
	InitRoutesAdminCustomers(mux, handlers.AdminCustomerHandler{})
	InitRoutesAdminOrders(mux, handlers.AdminOrdersHandler{})
	InitRoutesHome(mux, home)
	InitRoutesReviews(mux, home)
	InitRoutesNewsletter(mux, handlers.NewsletterHandler{})
	InitRoutesPromotions(mux, handlers.PromotionHandler{}, products)
	noContent := func(w http.ResponseWriter, r *http.Request) { w.WriteHeader(204) }
	InitRoutesShipping(mux, noContent, noContent, noContent, noContent)
	InitRoutesUploads(mux, t.TempDir())
	for _, pattern := range []string{
		"POST /register", "POST /login", "POST /send-reset-token", "POST /validate-reset-code", "POST /validate-reset-token", "POST /reset-password",
		"GET /me", "PATCH /me", "GET /me/addresses", "POST /me/addresses", "PATCH /me/addresses/{id}", "DELETE /me/addresses/{id}", "PUT /me/addresses/{id}/default",
		"GET /cart", "POST /cart/items", "PATCH /cart/items/{id}", "DELETE /cart/items/{id}", "DELETE /cart", "POST /cart/orders/{orderID}",
		"POST /checkout", "GET /checkout/success/{id}", "GET /orders", "GET /orders/{id}", "POST /orders/{id}/cancel",
		"GET /favorites", "PUT /favorites/{productId}", "DELETE /favorites/{productId}",
		"GET /admin/products/{id}", "PATCH /admin/products/{id}", "DELETE /admin/products/{id}",
		"GET /admin/products/{id}/images", "PUT /admin/products/{id}/images", "DELETE /admin/products/{id}/images/{imageId}", "PUT /admin/products/{id}/variants",
		"GET /admin/products", "GET /admin/products/brands", "GET /admin/dashboard",
		"GET /admin/catalog/categories", "POST /admin/catalog/categories", "PATCH /admin/catalog/categories/{id}", "DELETE /admin/catalog/categories/{id}",
		"GET /admin/catalog/brands", "POST /admin/catalog/brands", "PATCH /admin/catalog/brands/{id}", "DELETE /admin/catalog/brands/{id}",
		"GET /products", "GET /products/categories", "POST /products", "POST /upload-image", "GET /products/{id}/related",
		"GET /admin/customers", "GET /admin/customers/{id}", "GET /admin/customers/{id}/orders",
		"GET /admin/orders", "GET /admin/orders/{id}", "POST /admin/orders/{id}/cancel",
		"GET /home/highlights", "GET /home/featured", "GET /home/categories", "GET /home/campaign", "GET /campaigns/{id}", "GET /home/reviews",
		"GET /orders/{id}/review", "POST /orders/{id}/review", "GET /admin/experience-reviews", "PATCH /admin/experience-reviews/{id}",
		"GET /shipping/quote", "GET /admin/catalog/shipping-ranges", "POST /admin/catalog/shipping-ranges", "PATCH /admin/catalog/shipping-ranges/{id}", "DELETE /admin/catalog/shipping-ranges/{id}",
		"POST /api/newsletter/subscribe", "POST /api/promotions/create", "GET /admin/promotions", "POST /admin/promotions/image", "PUT /admin/promotions/{id}", "POST /api/promotions/add",
	} {
		parts := strings.SplitN(pattern, " ", 2)
		path := parts[1]
		for _, name := range []string{"id", "orderID", "productId", "imageId"} {
			path = strings.ReplaceAll(path, "{"+name+"}", "42")
		}
		_, matched := mux.Handler(httptest.NewRequest(parts[0], path, nil))
		if matched != pattern {
			t.Errorf("%s matched %q", pattern, matched)
		}
	}
	for _, test := range []struct{ path, pattern string }{
		{"/products/42", "GET /products/"}, {"/api/promotions/42", "GET /api/promotions/"}, {"/uploads/example.jpg", "/uploads/"},
	} {
		_, matched := mux.Handler(httptest.NewRequest("GET", test.path, nil))
		if matched != test.pattern {
			t.Errorf("%s matched %q", test.path, matched)
		}
	}
	t.Setenv("JWT_SECRET", "route-registration-test-only")
	for _, path := range []string{"/admin/products/42", "/admin/orders", "/admin/customers", "/admin/dashboard", "/admin/experience-reviews", "/admin/catalog/shipping-ranges", "/admin/promotions"} {
		for _, test := range []struct {
			role string
			want int
		}{{"", 401}, {"customer", 403}} {
			request := httptest.NewRequest("GET", path, nil)
			if test.role != "" {
				request.Header.Set("Authorization", "Bearer "+routeToken(t, test.role))
			}
			response := httptest.NewRecorder()
			mux.ServeHTTP(response, request)
			if response.Code != test.want {
				t.Errorf("%s role %q: got %d, want %d", path, test.role, response.Code, test.want)
			}
		}
	}
	for _, kind := range []string{"sales", "products", "customers", "stock"} {
		for _, suffix := range []string{"", "/export"} {
			path := "/admin/reports/" + kind + suffix
			_, matched := mux.Handler(httptest.NewRequest("GET", path, nil))
			if kind == "customers" && suffix == "/export" {
				if matched != "" {
					t.Fatal("customer export must remain disabled")
				}
			} else if matched != "GET "+path {
				t.Errorf("report %s not registered", path)
			}
		}
	}
}

// O teste do middleware removido agora verifica o roteador realmente utilizado.
// O 405 nativo tem corpo text/plain; respostas de autenticação continuam em JSON.
func TestServeMuxHTTPMethods(t *testing.T) {
	t.Setenv("JWT_SECRET", "route-registration-test-only")
	mux := http.NewServeMux()
	reached := 0
	adminRoute(mux, "GET /resource/{id}", func(w http.ResponseWriter, r *http.Request) {
		reached++
		if r.Method != http.MethodGet {
			t.Error("GET route must dispatch HEAD as a read")
		}
		if r.PathValue("id") != "42" {
			t.Error("path parameter lost")
		}
		w.Write([]byte("resource"))
	})
	adminRoute(mux, "PATCH /resource/{id}", func(w http.ResponseWriter, r *http.Request) {
		reached++
		w.WriteHeader(http.StatusNoContent)
	})
	for _, method := range []string{http.MethodPost, http.MethodPut, http.MethodDelete, http.MethodOptions, "CUSTOM"} {
		t.Run(method, func(t *testing.T) {
			response := httptest.NewRecorder()
			mux.ServeHTTP(response, httptest.NewRequest(method, "/resource/42", nil))
			if response.Code != http.StatusMethodNotAllowed || response.Header().Get("Allow") != "GET, HEAD, PATCH" {
				t.Fatalf("status %d, Allow %q", response.Code, response.Header().Get("Allow"))
			}
			if response.Header().Get("Content-Type") != "text/plain; charset=utf-8" || response.Body.String() != "Method Not Allowed\n" {
				t.Fatal("unexpected native 405 format")
			}
		})
	}
	if reached != 0 {
		t.Fatal("unsupported method reached protected handler")
	}
	for _, method := range []string{http.MethodGet, http.MethodHead, http.MethodPatch} {
		for _, test := range []struct {
			role string
			want int
		}{{"", 401}, {"customer", 403}, {"admin", 200}} {
			request := httptest.NewRequest(method, "/resource/42", nil)
			if test.role != "" {
				request.Header.Set("Authorization", "Bearer "+routeToken(t, test.role))
			}
			response := httptest.NewRecorder()
			mux.ServeHTTP(response, request)
			want := test.want
			if method == http.MethodPatch && test.role == "admin" {
				want = 204
			}
			if response.Code != want {
				t.Fatalf("%s role %q: got %d, want %d", method, test.role, response.Code, want)
			}
			if want == 401 || want == 403 {
				if !strings.Contains(response.Header().Get("Content-Type"), "application/json") {
					t.Fatal("authorization error format changed")
				}
			}
		}
	}
	// Um servidor real confirma que HEAD não envia corpo na resposta HTTP.
	server := httptest.NewServer(mux)
	defer server.Close()
	request, _ := http.NewRequest(http.MethodHead, server.URL+"/resource/42", nil)
	request.Header.Set("Authorization", "Bearer "+routeToken(t, "admin"))
	response, err := server.Client().Do(request)
	if err != nil {
		t.Fatal(err)
	}
	defer response.Body.Close()
	body, err := io.ReadAll(response.Body)
	if err != nil || response.StatusCode != 200 || len(body) != 0 {
		t.Fatal("HEAD must match GET without a response body")
	}
}
