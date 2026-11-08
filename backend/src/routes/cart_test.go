package routes

import (
	"backend/src/config"
	"backend/src/db"
	"backend/src/handlers"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/services"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"github.com/golang-jwt/jwt/v5"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"sync"
	"testing"
	"time"
)

// Opt-in integration suite: runs migrations in an isolated disposable schema,
// never against the application's tables. Set CART_TEST_LOCAL=1 for local dev.
func TestCartPostgres(t *testing.T) {
	conn, err := openTestDatabase(t)
	if err != nil {
		t.Fatal("cannot open test database")
	}
	defer conn.Close()
	conn.SetMaxOpenConns(1)
	if err = conn.Ping(); err != nil {
		t.Fatal("test PostgreSQL unavailable")
	}
	schema := fmt.Sprintf("cart_test_%d", time.Now().UnixNano())
	if _, err = conn.Exec(`CREATE SCHEMA ` + schema); err != nil {
		t.Fatal(err)
	}
	defer conn.Exec(`DROP SCHEMA ` + schema + ` CASCADE`)
	if _, err = conn.Exec(`SET search_path TO ` + schema); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{"000001_initial_schema.up.sql", "000002_simplify_customer_registration.up.sql", "000003_cart.up.sql"} {
		migration, err := os.ReadFile("../../migrations/" + name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = conn.Exec(string(migration)); err != nil {
			t.Fatal(err)
		}
	}
	if _, err = conn.Exec(`INSERT INTO users(id,full_name,email,password) VALUES(1,'Test One','one@example.test','unused'),(2,'Test Two','two@example.test','unused');
 INSERT INTO products(id,name,price,quantity,status) VALUES(1,'Test product',129.90,10,'active'),(2,'Inactive',9.99,10,'inactive'),(3,'No stock',9.99,0,'active')`); err != nil {
		t.Fatal(err)
	}
	t.Setenv("JWT_SECRET", "cart-tests-only-secret")
	token := func(user int) string {
		value, err := jwt.NewWithClaims(jwt.SigningMethodHS256, models.Claims{UserID: user, Role: "customer", RegisteredClaims: jwt.RegisteredClaims{Issuer: "box-enxovais-api", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}}).SignedString([]byte("cart-tests-only-secret"))
		if err != nil {
			t.Fatal(err)
		}
		return value
	}
	tokens := map[int]string{1: token(1), 2: token(2)}
	products := handlers.ProductHandler{Service: services.ProductService{Store: repositories.ProductRepository{DB: conn}}}
	images := handlers.ProductImageHandler{Service: services.ProductImageService{
		Store: repositories.ProductImageRepository{DB: conn}, Directory: t.TempDir(),
	}}
	promotions := handlers.PromotionHandler{Service: services.PromotionService{Store: repositories.PromotionRepository{DB: conn}}}
	cartHandler := handlers.CartHandler{Store: repositories.CartRepository{DB: conn}}
	mux := http.NewServeMux()
	InitRoutesCart(mux, cartHandler)
	InitRoutesProducts(mux, products, images)
	InitRoutesPromotions(mux, promotions, products)
	testProductPagination(t, conn, mux)
	call := func(user int, method, path, body string, want int) models.Cart {
		t.Helper()
		r := httptest.NewRequest(method, path, strings.NewReader(body))
		if user > 0 {
			r.Header.Set("Authorization", "Bearer "+tokens[user])
		}
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, r)
		if w.Code != want {
			t.Fatalf("%s %s: got %d want %d: %s", method, path, w.Code, want, w.Body.String())
		}
		var response struct {
			Data models.Cart `json:"data"`
		}
		// Money uses cents internally; decode public JSON separately below.
		if want == 200 {
			var raw struct {
				Data struct {
					Items []struct {
						ID       int64 `json:"id"`
						Quantity int64 `json:"quantity"`
					} `json:"items"`
					TotalItems int64   `json:"totalItems"`
					Total      float64 `json:"total"`
				} `json:"data"`
			}
			if err := json.Unmarshal(w.Body.Bytes(), &raw); err != nil {
				t.Fatal(err)
			}
			response.Data.TotalItems = raw.Data.TotalItems
			response.Data.Total = models.Money(raw.Data.Total*100 + 0.5)
			for _, item := range raw.Data.Items {
				response.Data.Items = append(response.Data.Items, models.CartItem{ID: item.ID, Quantity: item.Quantity})
			}
		}
		return response.Data
	}
	call(0, "GET", "/cart", "", 401)
	if cart := call(1, "GET", "/cart", "", 200); cart.TotalItems != 0 {
		t.Fatal("initial cart not empty")
	}
	cart := call(1, "POST", "/cart/items", `{"productId":1,"quantity":1}`, 200)
	itemID := cart.Items[0].ID
	path := fmt.Sprintf("/cart/items/%d", itemID)
	cart = call(1, "POST", "/cart/items", `{"productId":1,"quantity":1}`, 200)
	if len(cart.Items) != 1 || cart.TotalItems != 2 || cart.Total != 25980 {
		t.Fatal("duplicate or wrong total", cart)
	}
	if cart = call(1, "PATCH", path, `{"quantity":3}`, 200); cart.TotalItems != 3 || cart.Total != 38970 {
		t.Fatal("update")
	}
	call(1, "PATCH", path, `{"quantity":0}`, 400)
	call(1, "PATCH", path, `{"quantity":-1}`, 400)
	call(1, "PATCH", path, `{"quantity":11}`, 409)
	call(1, "POST", "/cart/items", `{"productId":1,"quantity":1,"unitPrice":0}`, 400)
	call(1, "POST", "/cart/items", `{"productId":2,"quantity":1}`, 409)
	call(1, "POST", "/cart/items", `{"productId":3,"quantity":1}`, 409)
	call(1, "POST", "/cart/items", `{"productId":999,"quantity":1}`, 409)
	call(2, "PATCH", path, `{"quantity":1}`, 404)
	call(2, "DELETE", path, "", 404)
	if cart = call(2, "GET", "/cart?userId=1", "", 200); cart.TotalItems != 0 {
		t.Fatal("cross-user read")
	}
	if cart = call(1, "DELETE", path, "", 200); cart.TotalItems != 0 {
		t.Fatal("remove")
	}
	call(1, "POST", "/cart/items", `{"productId":1,"quantity":2}`, 200)
	if cart = call(1, "DELETE", "/cart", "", 200); cart.TotalItems != 0 {
		t.Fatal("clear")
	}
	// Concurrent HTTP additions must not overwrite or duplicate the line.
	var wg sync.WaitGroup
	for i := 0; i < 5; i++ {
		wg.Add(1)
		go func() {
			defer wg.Done()
			r := httptest.NewRequest("POST", "/cart/items", strings.NewReader(`{"productId":1,"quantity":1}`))
			r.Header.Set("Authorization", "Bearer "+tokens[1])
			w := httptest.NewRecorder()
			mux.ServeHTTP(w, r)
			if w.Code != 200 {
				t.Errorf("concurrent add: %d", w.Code)
			}
		}()
	}
	wg.Wait()
	if cart = call(1, "GET", "/cart", "", 200); cart.TotalItems != 5 || len(cart.Items) != 1 {
		t.Fatal("concurrent additions", cart)
	}
	// The page sees the current stock, but a later cart operation must re-read it.
	details := httptest.NewRecorder()
	mux.ServeHTTP(details, httptest.NewRequest("GET", "/products/1", nil))
	var product struct {
		Stock  int    `json:"stock"`
		Status string `json:"status"`
	}
	if err := json.Unmarshal(details.Body.Bytes(), &product); err != nil {
		t.Fatal(err)
	}
	if details.Code != 200 || product.Stock != 10 || product.Status != "active" {
		t.Fatal("product stock contract", details.Body.String())
	}
	// Adding to a cart has not decremented the 10 units stored on the product.
	for _, test := range []struct {
		stock   int
		message string
	}{{2, "Só temos 2 unidades disponíveis"}, {0, "Este produto ficou sem estoque"}} {
		if _, err := conn.Exec(`UPDATE products SET quantity=$1 WHERE id=1`, test.stock); err != nil {
			t.Fatal(err)
		}
		for _, request := range []struct{ method, path, body string }{{"POST", "/cart/items", `{"productId":1,"quantity":1}`}, {"PATCH", fmt.Sprintf("/cart/items/%d", cart.Items[0].ID), `{"quantity":6}`}} {
			r := httptest.NewRequest(request.method, request.path, strings.NewReader(request.body))
			r.Header.Set("Authorization", "Bearer "+tokens[1])
			w := httptest.NewRecorder()
			mux.ServeHTTP(w, r)
			if w.Code != 409 || !strings.Contains(w.Body.String(), test.message) {
				t.Fatalf("stock changed: %d %s", w.Code, w.Body.String())
			}
		}
	}
	if unchanged := call(1, "GET", "/cart", "", 200); unchanged.TotalItems != 5 {
		t.Fatal("rejected mutation changed cart")
	}

	// Reload must report the new stock without silently removing the customer's item.
	reloaded := httptest.NewRecorder()
	reloadRequest := httptest.NewRequest("GET", "/cart", nil)
	reloadRequest.Header.Set("Authorization", "Bearer "+tokens[1])
	mux.ServeHTTP(reloaded, reloadRequest)
	var current struct {
		Data struct {
			Items []struct {
				Stock     int64 `json:"stock"`
				Available bool  `json:"available"`
				Quantity  int64 `json:"quantity"`
			} `json:"items"`
		} `json:"data"`
	}
	if err := json.Unmarshal(reloaded.Body.Bytes(), &current); err != nil {
		t.Fatal(err)
	}
	if reloaded.Code != 200 || len(current.Data.Items) != 1 || current.Data.Items[0].Stock != 0 || current.Data.Items[0].Available || current.Data.Items[0].Quantity != 5 {
		t.Fatal("stale cart stock", reloaded.Body.String())
	}
	if _, err := conn.Exec(`UPDATE products SET quantity=10,status='inactive' WHERE id=1`); err != nil {
		t.Fatal(err)
	}
	call(1, "POST", "/cart/items", `{"productId":1,"quantity":1}`, 409)
	call(1, "PATCH", path, `{"quantity":2}`, 404) // The original item was removed earlier.
	currentPath := fmt.Sprintf("/cart/items/%d", cart.Items[0].ID)
	call(1, "PATCH", currentPath, `{"quantity":2}`, 409)
	if _, err := conn.Exec(`UPDATE products SET status='active' WHERE id=1`); err != nil {
		t.Fatal(err)
	}

	// Promotional cards and cart use valid dates; the cart always calculates the price itself.
	if _, err := conn.Exec(`UPDATE products SET quantity=10 WHERE id=1;
 INSERT INTO promotions(id,name,status,start_date,end_date) VALUES(2,'Winter','active',NOW()-INTERVAL '1 day',NOW()+INTERVAL '1 day');
 INSERT INTO promotion_products(promotion_id,product_id,promotional_price) VALUES(2,1,100)`); err != nil {
		t.Fatal(err)
	}
	if priced := call(1, "POST", "/cart/items", `{"productId":1,"quantity":1}`, 200); priced.Total != 60000 || priced.TotalItems != 6 {
		t.Fatal("promotional price not applied", priced)
	}
	if _, err := conn.Exec(`UPDATE promotions SET end_date=NOW()-INTERVAL '1 hour' WHERE id=2`); err != nil {
		t.Fatal(err)
	}
	if priced := call(1, "GET", "/cart", "", 200); priced.Total != 77940 {
		t.Fatal("expired price still applied", priced)
	}

	var remainingStock int
	if err := conn.QueryRow(`SELECT quantity FROM products WHERE id=1`).Scan(&remainingStock); err != nil {
		t.Fatal(err)
	}
	if remainingStock != 10 {
		t.Fatal("cart mutation changed physical stock", remainingStock)
	}

}

func openTestDatabase(t *testing.T) (*sql.DB, error) {
	t.Helper()
	if dsn := os.Getenv("CART_TEST_DATABASE_URL"); dsn != "" {
		return sql.Open("postgres", dsn)
	}
	if os.Getenv("CART_TEST_LOCAL") != "1" {
		t.Skip("set CART_TEST_DATABASE_URL or CART_TEST_LOCAL=1 to run PostgreSQL integration")
	}
	cfg, err := config.Load("../../.env")
	if err != nil {
		return nil, err
	}
	return db.Open(context.Background(), cfg.Database)
}
