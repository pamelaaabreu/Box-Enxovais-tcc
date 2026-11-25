package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/services"
	"context"
	"errors"
	"net/http/httptest"
	"strings"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"gopkg.in/gomail.v2"
)

func TestNewsletterServicePostgres(t *testing.T) {
	db, exec := checkoutTestDB(t)
	exec(`CREATE TABLE subscribers(email text UNIQUE NOT NULL)`)
	t.Setenv("EMAIL", "store@example.invalid")
	var sent atomic.Int32
	handler := handlers.NewsletterHandler{Service: services.NewsletterService{Store: repositories.SubscriberRepository{DB: db}, Send: func(*gomail.Message) error { sent.Add(1); return nil }}}
	call := func(email string) int {
		w := httptest.NewRecorder()
		handler.SubscribeNewsletter(w, httptest.NewRequest("POST", "/api/newsletter/subscribe", strings.NewReader(`{"email":"`+email+`"}`)))
		return w.Code
	}
	t.Run("concurrent_idempotency", func(t *testing.T) {
		var wg sync.WaitGroup
		statuses := make(chan int, 12)
		for range 12 {
			wg.Add(1)
			go func() { defer wg.Done(); statuses <- call(" PERSON@EXAMPLE.INVALID ") }()
		}
		wg.Wait()
		close(statuses)
		for code := range statuses {
			if code != 200 {
				t.Fatalf("subscription status=%d", code)
			}
		}
		var count int
		if err := db.QueryRow(`SELECT count(*) FROM subscribers WHERE email='person@example.invalid'`).Scan(&count); err != nil || count != 1 || sent.Load() != 1 {
			t.Fatalf("count=%d sent=%d err=%v", count, sent.Load(), err)
		}
	})
	t.Run("invalid_email", func(t *testing.T) {
		if code := call("Display <person@example.invalid>"); code != 400 {
			t.Fatalf("invalid email HTTP=%d", code)
		}
	})
	t.Run("persistence_failure", func(t *testing.T) {
		exec(`DROP TABLE subscribers`)
		if code := call("another@example.invalid"); code != 500 || sent.Load() != 1 {
			t.Fatal("database failure sent or succeeded", code)
		}
	})
}

func TestPromotionServiceErrorClassificationPostgres(t *testing.T) {
	db, exec := checkoutTestDB(t)
	exec(`ALTER TABLE promotions ADD COLUMN name text;INSERT INTO promotions VALUES(1,'active',now()-interval '1 day',now()+interval '1 day','Campaign')`)
	service := services.PromotionService{Store: repositories.PromotionRepository{DB: db}}
	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	t.Run("missing_product", func(t *testing.T) {
		if err := service.AddProduct(ctx, models.AddToPromotionRequest{ProductID: 999, PromotionName: "Campaign", PromotionalPrice: 7}); !errors.Is(err, services.ErrPromotionInvalid) {
			t.Fatal(err)
		}
	})
	t.Run("changed_under_lock", func(t *testing.T) {
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			t.Fatal(err)
		}
		defer tx.Rollback()
		if _, err = tx.Exec(`UPDATE products SET price=5 WHERE id=1`); err != nil {
			t.Fatal(err)
		}
		done := make(chan int, 1)
		go func() {
			handler := handlers.PromotionHandler{Service: service}
			w := httptest.NewRecorder()
			handler.AddProductToPromotion(w, httptest.NewRequest("POST", "/promotions/products", strings.NewReader(`{"product_id":1,"promotion_name":"Campaign","promotional_price":7}`)).WithContext(ctx))
			done <- w.Code
		}()
		select {
		case code := <-done:
			t.Fatalf("expected locked validation, HTTP=%d", code)
		case <-time.After(100 * time.Millisecond):
		}
		if err = tx.Commit(); err != nil {
			t.Fatal(err)
		}
		select {
		case code := <-done:
			if code != 400 {
				t.Fatalf("transaction validation HTTP=%d", code)
			}
		case <-ctx.Done():
			t.Fatal(ctx.Err())
		}
		var count int
		if err = db.QueryRow(`SELECT count(*) FROM promotion_products`).Scan(&count); err != nil || count != 0 {
			t.Fatal("invalid discount persisted", err)
		}
	})
	t.Run("internal_lookup", func(t *testing.T) {
		exec(`ALTER TABLE products RENAME TO temporarily_missing_products`)
		defer exec(`ALTER TABLE temporarily_missing_products RENAME TO products`)
		if err := service.AddProduct(ctx, models.AddToPromotionRequest{ProductID: 1, PromotionalPrice: 1}); !errors.Is(err, services.ErrPromotionLookup) {
			t.Fatal("internal failure misclassified", err)
		}
	})
}
