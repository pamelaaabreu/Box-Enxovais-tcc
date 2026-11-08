package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"backend/src/pagination"
	"backend/src/repositories"
	"backend/src/services"
	"context"
	"database/sql"
	"encoding/json"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"sync"
	"testing"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

func favoriteTestToken(t *testing.T, userID int) string {
	t.Helper()
	token, err := jwt.NewWithClaims(jwt.SigningMethodHS256, models.Claims{
		UserID: userID, Role: "customer", RegisteredClaims: jwt.RegisteredClaims{
			Issuer: "box-enxovais-api", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour)),
		},
	}).SignedString([]byte("favorites-tests-only"))
	if err != nil {
		t.Fatal("cannot sign test token")
	}
	return token
}

func TestFavoritesAuthorization(t *testing.T) {
	t.Setenv("JWT_SECRET", "favorites-tests-only")
	mux := http.NewServeMux()
	InitRoutesFavorites(mux, handlers.FavoritesHandler{})
	for _, method := range []string{"GET", "PUT", "DELETE"} {
		path := "/favorites"
		if method != "GET" {
			path += "/1"
		}
		response := httptest.NewRecorder()
		mux.ServeHTTP(response, httptest.NewRequest(method, path, nil))
		if response.Code != 401 {
			t.Fatalf("unauthenticated %s: %d", method, response.Code)
		}
	}
	for _, path := range []string{"/favorites/0", "/favorites/-1", "/favorites/not-an-id", "/favorites/9223372036854775807"} {
		request := httptest.NewRequest("PUT", path, nil)
		request.Header.Set("Authorization", "Bearer "+favoriteTestToken(t, 1))
		response := httptest.NewRecorder()
		mux.ServeHTTP(response, request)
		if response.Code != 400 {
			t.Fatalf("invalid ID accepted: %d", response.Code)
		}
	}
	for _, query := range []string{"user_id=2", "limit=0", "offset=-1", "password=test", "limit=2&limit=3", "name=%zz"} {
		request := httptest.NewRequest("GET", "/favorites?"+query, nil)
		request.Header.Set("Authorization", "Bearer "+favoriteTestToken(t, 1))
		response := httptest.NewRecorder()
		mux.ServeHTTP(response, request)
		if response.Code != 400 {
			t.Fatalf("invalid filter accepted: %d", response.Code)
		}
	}
}

// Only a disposable schema is modified; public application tables are never touched.
func TestFavoritesPostgres(t *testing.T) {
	conn, err := openTestDatabase(t)
	if err != nil {
		t.Fatal("cannot open test database")
	}
	defer conn.Close()
	schema := fmt.Sprintf("favorites_test_%d", time.Now().UnixNano())
	if _, err = conn.Exec("CREATE SCHEMA " + schema); err != nil {
		t.Fatal(err)
	}
	defer conn.Exec("DROP SCHEMA " + schema + " CASCADE")
	if _, err = conn.Exec("SET search_path TO " + schema); err != nil {
		t.Fatal(err)
	}
	for _, name := range []string{
		"000001_initial_schema.up.sql", "000002_simplify_customer_registration.up.sql", "000003_cart.up.sql",
		"000004_products_quantity_nonnegative.up.sql", "000005_favorites.up.sql",
	} {
		migration, err := os.ReadFile("../../migrations/" + name)
		if err != nil {
			t.Fatal(err)
		}
		if _, err = conn.Exec(string(migration)); err != nil {
			t.Fatal(err)
		}
	}
	if _, err = conn.Exec(`INSERT INTO users(id,full_name,email,password) VALUES
  (1,'Favorite One','favorite-one@example.test','unused'),(2,'Favorite Two','favorite-two@example.test','unused');
  INSERT INTO products(id,name,price,quantity,status) VALUES
  (1,'Fixture One',10,5,'active'),(2,'Inactive',10,4,'inactive'),(3,'No stock',10,0,'active'),(4,'Concurrent',10,10,'active')`); err != nil {
		t.Fatal(err)
	}
	// Warm all connections with the isolated search_path, enabling real concurrent inserts.
	conn.SetMaxOpenConns(4)
	conn.SetMaxIdleConns(4)
	reserved := []*sql.Conn{}
	for i := 0; i < 4; i++ {
		connection, err := conn.Conn(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		if _, err = connection.ExecContext(context.Background(), "SET search_path TO "+schema); err != nil {
			connection.Close()
			t.Fatal(err)
		}
		reserved = append(reserved, connection)
	}
	for _, connection := range reserved {
		connection.Close()
	}
	t.Setenv("JWT_SECRET", "favorites-tests-only")
	tokens := map[int]string{1: favoriteTestToken(t, 1), 2: favoriteTestToken(t, 2)}
	mux := http.NewServeMux()
	InitRoutesFavorites(mux, handlers.FavoritesHandler{Service: services.FavoritesService{Store: repositories.FavoritesRepository{DB: conn}}})
	serve := func(userID int, method, path string) *httptest.ResponseRecorder {
		request := httptest.NewRequest(method, path, nil)
		if userID > 0 {
			request.Header.Set("Authorization", "Bearer "+tokens[userID])
		}
		response := httptest.NewRecorder()
		mux.ServeHTTP(response, request)
		return response
	}
	call := func(userID int, method, path string, want int) *httptest.ResponseRecorder {
		t.Helper()
		response := serve(userID, method, path)
		if response.Code != want {
			t.Fatalf("%s %s: got %d want %d: %s", method, path, response.Code, want, response.Body.String())
		}
		return response
	}
	read := func(userID int, path string) pagination.Page[models.Product] {
		t.Helper()
		response := call(userID, "GET", path, 200)
		if response.Header().Get("Cache-Control") != "no-store" {
			t.Fatal("personal response can be cached")
		}
		var page pagination.Page[models.Product]
		if err := json.Unmarshal(response.Body.Bytes(), &page); err != nil {
			t.Fatal(err)
		}
		if page.Items == nil {
			t.Fatal("page must have a non-null items array")
		}
		return page
	}
	call(1, "PUT", "/favorites/1", 200)
	call(1, "PUT", "/favorites/1", 200)
	call(1, "PUT", "/favorites/3", 200)
	call(1, "PUT", "/favorites/999999", 404)
	call(1, "PUT", "/favorites/2", 409)
	first := read(1, "/favorites")
	if first.Pagination.Total != 2 || len(first.Items) != 2 || first.Items[0].ID != 1 || first.Items[1].ID != 3 || first.Items[1].Stock != 0 {
		t.Fatal("invalid favorite product DTO/order")
	}
	if read(2, "/favorites").Pagination.Total != 0 {
		t.Fatal("favorites leaked across accounts")
	}
	call(2, "DELETE", "/favorites/1", 200)
	if read(1, "/favorites").Pagination.Total != 2 {
		t.Fatal("another account removed a favorite")
	}
	call(2, "PUT", "/favorites/1", 200)
	call(1, "DELETE", "/favorites/1", 200)
	call(1, "DELETE", "/favorites/1", 200)
	if read(2, "/favorites").Pagination.Total != 1 {
		t.Fatal("delete crossed account boundary")
	}
	if _, err = conn.Exec("UPDATE products SET status='archived' WHERE id=3"); err != nil {
		t.Fatal(err)
	}
	unavailable := read(1, "/favorites?status=archived")
	if unavailable.Pagination.Total != 1 || unavailable.Items[0].ID != 3 {
		t.Fatal("unavailable favorites were hidden")
	}
	call(1, "PUT", "/favorites/3", 200)
	var group sync.WaitGroup
	codes := make(chan int, 16)
	for i := 0; i < 16; i++ {
		group.Add(1)
		go func() { defer group.Done(); codes <- serve(1, "PUT", "/favorites/4").Code }()
	}
	group.Wait()
	close(codes)
	for code := range codes {
		if code != 200 {
			t.Fatalf("concurrent addition: %d", code)
		}
	}
	var count, stock int
	if err = conn.QueryRow("SELECT count(*) FROM favorites WHERE user_id=1 AND product_id=4").Scan(&count); err != nil || count != 1 {
		t.Fatal("concurrent favorite duplicated")
	}
	if err = conn.QueryRow("SELECT quantity FROM products WHERE id=4").Scan(&stock); err != nil || stock != 10 {
		t.Fatal("favorites changed stock")
	}
	if _, err = conn.Exec(`INSERT INTO products(id,name,price,quantity,status) SELECT n,'Fixture '||n,10,0,'active' FROM generate_series(5,27) n;
  INSERT INTO favorites(user_id,product_id) SELECT 1,id FROM products WHERE id>=5`); err != nil {
		t.Fatal(err)
	}
	filtered := read(1, "/favorites?name__contains=Fixture&stock__gte=0&limit=2")
	if filtered.Pagination.Total != 23 || len(filtered.Items) != 2 || !filtered.Pagination.HasMore || filtered.Items[0].ID != 5 {
		t.Fatal("invalid filtered page")
	}
	next := read(1, "/favorites?name__contains=Fixture&offset=2&limit=2")
	if next.Items[0].ID != 7 {
		t.Fatal("unstable pagination")
	}
	empty := read(1, "/favorites?offset=999&limit=2")
	if len(empty.Items) != 0 || empty.Pagination.Total != 25 || empty.Pagination.HasMore {
		t.Fatal("invalid empty page")
	}
	call(1, "GET", "/favorites?user_id=2", 400)
	call(1, "GET", "/favorites?name__contains__eq=invalid", 400)
	if read(1, "/favorites?name__contains=%27%20OR%201%3D1--").Pagination.Total != 0 {
		t.Fatal("filter values were treated as SQL")
	}
	if _, err = conn.Exec("DELETE FROM products WHERE id=4; DELETE FROM users WHERE id=2"); err != nil {
		t.Fatal(err)
	}
	if err = conn.QueryRow("SELECT count(*) FROM favorites WHERE product_id=4 OR user_id=2").Scan(&count); err != nil || count != 0 {
		t.Fatal("favorite foreign keys did not cascade")
	}
	down, err := os.ReadFile("../../migrations/000005_favorites.down.sql")
	if err != nil {
		t.Fatal(err)
	}
	if _, err = conn.Exec(string(down)); err != nil {
		t.Fatal(err)
	}
	if err = conn.QueryRow("SELECT count(*) FROM products").Scan(&count); err != nil || count == 0 {
		t.Fatal("down migration changed products")
	}
}
