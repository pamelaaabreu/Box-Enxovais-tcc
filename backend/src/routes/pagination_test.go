package routes

import (
	"backend/src/models"
	"backend/src/pagination"
	"database/sql"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

// Reuses the isolated PostgreSQL schema/migrations from TestCartPostgres.
func testProductPagination(t *testing.T, conn *sql.DB, mux *http.ServeMux) {
	t.Helper()
	if _, err := conn.Exec(`INSERT INTO promotions(id,name,status,start_date,end_date) VALUES(1,'Test','active',NOW(),NOW()+INTERVAL '1 day');
 INSERT INTO promotion_products(promotion_id,product_id,promotional_price) VALUES(1,1,100),(1,3,5);
 INSERT INTO product_images(product_id,image_path) VALUES(1,'one.png'),(1,'two.png');
 UPDATE products SET created_at=NULL,updated_at=NULL WHERE id=3`); err != nil {
		t.Fatal(err)
	}
	defer conn.Exec(`DELETE FROM promotion_products WHERE promotion_id=1; DELETE FROM promotions WHERE id=1`)
	tests := []struct {
		path   string
		status int
		total  int64
		ids    []int64
		more   bool
	}{
		{"/products?limit=1", 200, 2, []int64{1}, true},
		{"/products?offset=1&limit=1", 200, 2, []int64{3}, false},
		{"/products?offset=50&limit=1", 200, 2, []int64{}, false},
		{"/products?stock__gte=1&price__lte=130", 200, 1, []int64{1}, false},
		{"/products?name__contains=TEST", 200, 1, []int64{1}, false},
		{"/products?status=inactive", 200, 0, []int64{}, false},
		{"/products?name=%27%20OR%201%3D1--", 200, 0, []int64{}, false},
		{"/products?name__contains=%25", 200, 0, []int64{}, false},
		{"/products?price__gte=invalid", 400, 0, nil, false},
		{"/products?limit=101", 400, 0, nil, false},
		{"/products?user_id=1", 400, 0, nil, false},
		{"/products?limit=1;offset=2", 400, 0, nil, false},
		{"/api/promotions/Test?limit=1", 200, 2, []int64{1}, true},
		{"/api/promotions/Test?offset=1&limit=1", 200, 2, []int64{3}, false},
		{"/api/promotions/Test?promotional_price__lte=10", 200, 1, []int64{3}, false},
		{"/api/promotions/Unknown", 200, 0, []int64{}, false},
	}
	for _, test := range tests {
		t.Run(test.path, func(t *testing.T) {
			w := httptest.NewRecorder()
			mux.ServeHTTP(w, httptest.NewRequest("GET", test.path, nil))
			if w.Code != test.status {
				t.Fatalf("status %d: %s", w.Code, w.Body.String())
			}
			if w.Code != 200 {
				return
			}
			var page pagination.Page[models.Product]
			if err := json.Unmarshal(w.Body.Bytes(), &page); err != nil {
				t.Fatal(err)
			}
			if page.Items == nil || page.Pagination.Total != test.total || page.Pagination.HasMore != test.more || len(page.Items) != len(test.ids) {
				t.Fatal(w.Body.String())
			}
			for i, id := range test.ids {
				if page.Items[i].ID != id {
					t.Fatal(page.Items)
				}
			}
			if len(page.Items) > 0 && page.Items[0].ID == 1 && len(page.Items[0].ImagePaths) != 2 {
				t.Fatal("gallery changed")
			}
		})
	}
	// Expired/future promotions and inactive products must not appear as purchasable offers.
	for _, update := range []string{
		`UPDATE promotions SET end_date=NOW()-INTERVAL '1 day' WHERE id=1`,
		`UPDATE promotions SET end_date=NOW()+INTERVAL '2 days',start_date=NOW()+INTERVAL '1 day' WHERE id=1`,
		`UPDATE promotions SET start_date=NOW()-INTERVAL '1 day' WHERE id=1; UPDATE products SET status='inactive' WHERE id IN (1,3)`,
	} {
		if _, err := conn.Exec(update); err != nil {
			t.Fatal(err)
		}
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, httptest.NewRequest("GET", "/api/promotions/Test", nil))
		var page pagination.Page[models.Product]
		if err := json.Unmarshal(w.Body.Bytes(), &page); err != nil {
			t.Fatal(err)
		}
		if w.Code != 200 || page.Pagination.Total != 0 || len(page.Items) != 0 {
			t.Fatal(w.Body.String())
		}
	}
	if _, err := conn.Exec(`UPDATE products SET status='active' WHERE id IN (1,3)`); err != nil {
		t.Fatal(err)
	}

}
