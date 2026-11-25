package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/services"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"
)

func TestProductReviewsPostgres(t *testing.T) {
	database, exec := checkoutTestDB(t)
	migration, err := os.ReadFile("../../migrations/000054_product_reviews.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	exec(string(migration))
	exec(`UPDATE users SET full_name='Ana Maria Sobrenome' WHERE id=1;
 INSERT INTO products(id,name,price,quantity,status) VALUES(2,'Não comprado',10,10,'active'),(3,'Concorrente',10,10,'active');
 INSERT INTO checkout_orders(user_id,request_key,address,payment_method,status,total_cents,stock_debited) VALUES
 (1,'review-owner','{}','pix','simulated_approved',1000,true),(2,'review-second','{}','pix','simulated_approved',1000,true),(1,'review-concurrent','{}','pix','simulated_approved',1000,true);
 INSERT INTO checkout_order_items(order_id,product_id,name,quantity,unit_price_cents)
 SELECT id,CASE WHEN request_key='review-concurrent' THEN 3 ELSE 1 END,'Produto',1,1000 FROM checkout_orders;
 INSERT INTO product_images(id,product_id,image_path,is_primary) VALUES(1,1,'uploads/product-fixture.jpg',true);`)
	t.Setenv("JWT_SECRET", "route-registration-test-only")
	repo := repositories.ProductReviewRepository{DB: database}
	mux := http.NewServeMux()
	InitRoutesProductReviews(mux, handlers.ProductReviewHandler{Service: services.ProductReviewService{Store: repo}})
	call := func(method, path, role, body string, want int) *httptest.ResponseRecorder {
		t.Helper()
		request := httptest.NewRequest(method, path, strings.NewReader(body))
		if role != "" {
			request.Header.Set("Authorization", "Bearer "+routeToken(t, role))
		}
		out := httptest.NewRecorder()
		mux.ServeHTTP(out, request)
		if out.Code != want {
			t.Fatalf("%s %s: got %d want %d: %s", method, path, out.Code, want, out.Body.String())
		}
		return out
	}
	summary := func(wantCount int, wantAverage float64) {
		t.Helper()
		var result map[int64]models.ProductReviewSummary
		out := call("GET", "/products/review-summaries?ids=1,2", "", "", 200)
		if err := json.Unmarshal(out.Body.Bytes(), &result); err != nil {
			t.Fatal(err)
		}
		if result[1].Count != wantCount || result[1].Average != wantAverage || result[2].Count != 0 || result[2].Average != 0 {
			t.Fatalf("unexpected summaries: %+v", result)
		}
	}
	mine := func() models.ProductReview {
		t.Helper()
		var items []models.ProductReview
		if err := json.Unmarshal(call("GET", "/me/product-reviews", "customer", "", 200).Body.Bytes(), &items); err != nil || len(items) != 1 {
			t.Fatal("own list incorrect", err)
		}
		return items[0]
	}
	approve := func(review models.ProductReview) {
		t.Helper()
		body := fmt.Sprintf(`{"status":"approved","expectedUpdatedAt":%q}`, review.UpdatedAt.Format("2006-01-02T15:04:05.999999999Z07:00"))
		call("PATCH", "/admin/product-reviews/"+strconv.FormatInt(review.ID, 10), "admin", body, 200)
	}
	t.Run("authentication_and_empty_summaries", func(t *testing.T) {
		call("GET", "/me/product-reviews", "", "", 401)
		call("GET", "/me/review-products", "", "", 401)
		call("POST", "/products/1/reviews", "", `{"rating":5}`, 401)
		call("GET", "/admin/product-reviews", "customer", "", 403)
		summary(0, 0)
		call("GET", "/products/review-summaries?ids=0", "", "", 400)
		call("GET", "/products/review-summaries?ids="+strings.Repeat("1,", 100)+"1", "", "", 400)
	})
	t.Run("purchase_required_validation_and_no_duplicates", func(t *testing.T) {
		call("POST", "/products/2/reviews", "customer", `{"rating":5}`, 404)
		for _, body := range []string{`{"rating":0}`, `{"rating":6}`, `{"rating":2.5}`, `{"rating":5,"userId":2}`, `{"rating":5} {}`, `{"rating":5,"comment":"` + strings.Repeat("a", 1001) + `"}`} {
			call("POST", "/products/1/reviews", "customer", body, 400)
		}
		call("POST", "/products/1/reviews", "customer", `{"rating":5,"comment":"  Muito confortável!  ","publicationConsent":true}`, 201)
		call("POST", "/products/1/reviews", "customer", `{"rating":4}`, 409)
		review := mine()
		if review.Rating != 5 || review.Comment != "Muito confortável!" || !review.CanEdit || review.ImagePath != "uploads/product-fixture.jpg" {
			t.Fatal("review not persisted")
		}
		summary(0, 0)
	})
	var reviewID int64
	t.Run("ownership_moderation_and_privacy", func(t *testing.T) {
		review := mine()
		reviewID = review.ID
		// O token sempre contém o usuário 1: uma linha de outro proprietário não pode ser editada.
		exec(`INSERT INTO product_reviews(product_id,user_id,order_id,rating,comment,publication_consent,status) SELECT 1,2,id,3,'Outro cliente',true,'approved' FROM checkout_orders WHERE request_key='review-second'`)
		var foreignID int64
		if err := database.QueryRow(`SELECT id FROM product_reviews WHERE user_id=2`).Scan(&foreignID); err != nil {
			t.Fatal(err)
		}
		call("PATCH", "/me/product-reviews/"+strconv.FormatInt(foreignID, 10), "customer", `{"rating":1}`, 404)
		call("PATCH", "/admin/product-reviews/"+strconv.FormatInt(review.ID, 10), "customer", `{"status":"approved"}`, 403)
		approve(review)
		summary(2, 4)
		public := call("GET", "/products/1/reviews", "", "", 200).Body.String()
		for _, secret := range []string{"Sobrenome", "Maria", "orderId", "userId", "email"} {
			if strings.Contains(public, secret) {
				t.Fatal("private review information exposed")
			}
		}
		if !strings.Contains(public, "Cliente verificado") {
			t.Fatal("privacy-preserving name missing")
		}
		home := call("GET", "/home/product-reviews", "", "", 200).Body.String()
		if !strings.Contains(home, "Muito confortável!") || strings.Contains(home, "Outro cliente") {
			t.Fatal("home must prioritize positive eligible opinions")
		}
	})
	t.Run("edit_same_record_reopen_moderation_and_refresh_average", func(t *testing.T) {
		before := mine()
		path := "/me/product-reviews/" + strconv.FormatInt(reviewID, 10)
		call("PATCH", path, "customer", `{"rating":1,"comment":"Opinião revisada","publicationConsent":true}`, 200)
		review := mine()
		if review.ID != before.ID || review.CreatedAt != before.CreatedAt || review.Rating != 1 || review.Comment != "Opinião revisada" || review.Status != "pending" {
			t.Fatal("edit did not update the existing row")
		}
		var count int
		if err := database.QueryRow(`SELECT count(*) FROM product_reviews WHERE product_id=1`).Scan(&count); err != nil || count != 2 {
			t.Fatal("edit changed record count")
		}
		summary(1, 3) // A edição ainda não aprovada não é publicada automaticamente.
		stale := fmt.Sprintf(`{"status":"approved","expectedUpdatedAt":%q}`, before.UpdatedAt.Format("2006-01-02T15:04:05.999999999Z07:00"))
		call("PATCH", "/admin/product-reviews/"+strconv.FormatInt(reviewID, 10), "admin", stale, 409)
		approve(review)
		summary(2, 2)
		body := call("GET", "/products/1/reviews", "", "", 200).Body.String()
		if !strings.Contains(body, "Opinião revisada") || strings.Contains(body, "Muito confortável!") {
			t.Fatal("public detail stale after approval")
		}
		if strings.Contains(call("GET", "/home/product-reviews", "", "", 200).Body.String(), "Opinião revisada") {
			t.Fatal("negative review included in positive home recommendations")
		}
	})
	t.Run("concurrent_creation_unique_constraint", func(t *testing.T) {
		results := checkoutParallel(func() error { return repo.Save(context.Background(), 1, 3, 0, models.ProductReviewInput{Rating: 5}) }, func() error { return repo.Save(context.Background(), 1, 3, 0, models.ProductReviewInput{Rating: 4}) })
		successes, duplicates := 0, 0
		for _, err := range results {
			if err == nil {
				successes++
			} else if errors.Is(err, repositories.ErrReviewDuplicate) {
				duplicates++
			} else {
				t.Fatal(err)
			}
		}
		if successes != 1 || duplicates != 1 {
			t.Fatal("concurrent insert duplicated the review")
		}
	})
	t.Run("consent_and_cancelled_orders_are_not_public_or_editable", func(t *testing.T) {
		exec(`UPDATE product_reviews SET publication_consent=false WHERE user_id=1 AND product_id=1`)
		summary(1, 3)
		exec(`UPDATE checkout_orders SET status='cancelled' WHERE request_key='review-second'`)
		summary(0, 0)
		exec(`UPDATE checkout_orders SET status='cancelled' WHERE request_key='review-owner'`)
		call("PATCH", "/me/product-reviews/"+strconv.FormatInt(reviewID, 10), "customer", `{"rating":5}`, 404)
	})
	t.Run("rollback_preserves_review_records", func(t *testing.T) {
		down, err := os.ReadFile("../../migrations/000054_product_reviews.down.sql")
		if err != nil {
			t.Fatal(err)
		}
		connection, err := database.Conn(context.Background())
		if err != nil {
			t.Fatal(err)
		}
		defer connection.Close()
		if _, err = connection.ExecContext(context.Background(), string(down)); err == nil {
			t.Fatal("rollback discarded product reviews")
		}
		if _, err = connection.ExecContext(context.Background(), "ROLLBACK"); err != nil {
			t.Fatal(err)
		}
		var count int
		if err = database.QueryRow(`SELECT count(*) FROM product_reviews`).Scan(&count); err != nil || count != 3 {
			t.Fatal("rollback rejection lost data")
		}
	})
}

func TestProductReviewMigrationEmptyRollbackPostgres(t *testing.T) {
	database, exec := checkoutTestDB(t)
	for _, direction := range []string{"up", "down", "up"} {
		data, err := os.ReadFile("../../migrations/000054_product_reviews." + direction + ".sql")
		if err != nil {
			t.Fatal(err)
		}
		exec(string(data))
	}
	var count int
	if err := database.QueryRow(`SELECT count(*) FROM product_reviews`).Scan(&count); err != nil || count != 0 {
		t.Fatal("migration did not restore an empty structure")
	}
}
