package routes

import (
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"database/sql"
	"errors"
	"os"
	"testing"
)

func TestFinalReviewEvolutionPostgres(t *testing.T) {
	db, exec := checkoutTestDB(t)
	ctx := context.Background()
	migration := func(name string) string {
		b, e := os.ReadFile("../../migrations/" + name)
		if e != nil {
			t.Fatal(e)
		}
		return string(b)
	}
	exec(migration("000045_home_experience_campaigns.up.sql"))
	exec(migration("000052_purchase_review_optional_criteria.up.sql"))
	exec(migration("000056_purchase_review_topics.up.sql"))
	exec(migration("000056_purchase_review_topics.down.sql"))
	exec(migration("000056_purchase_review_topics.up.sql"))
	exec(`INSERT INTO checkout_orders(user_id,request_key,address,payment_method,total_cents,stock_debited,status) VALUES(1,'final-review-owner','{}','pix',1000,true,'simulated_approved')`)
	repo := repositories.HomeRepository{DB: db}
	ease := 4
	input := models.ExperienceReview{Overall: 5, Experience: &ease, Topics: []string{"checkout", "shipping"}, Comment: "Ótima finalização", Consent: false}
	if e := repo.CreateReview(ctx, 1, 1, input); e != nil {
		t.Fatal(e)
	}
	r, e := repo.OrderReview(ctx, 1, 1)
	if e != nil || r == nil || r.Overall != 5 || len(r.Topics) != 2 || r.Experience == nil || *r.Experience != 4 {
		t.Fatal("persisted fields", e, r)
	}
	id := r.ID
	if e := repo.Moderate(ctx, id, 2, "approved"); !errors.Is(e, sql.ErrNoRows) {
		t.Fatal("private approval allowed", e)
	}
	input.Consent = true
	input.Overall = 4
	if e = repo.UpdateReview(ctx, 2, 1, input); !errors.Is(e, sql.ErrNoRows) {
		t.Fatal("foreign update", e)
	}
	if e = repo.UpdateReview(ctx, 1, 1, input); e != nil {
		t.Fatal(e)
	}
	r, e = repo.OrderReview(ctx, 1, 1)
	if e != nil || r.ID != id || r.Overall != 4 || r.Status != "pending" {
		t.Fatal("edit duplicated/lost fields", e)
	}
	mine, e := repo.MyReviews(ctx, 1)
	if e != nil || len(mine) != 1 {
		t.Fatal("mine", e)
	}
	foreign, e := repo.MyReviews(ctx, 2)
	if e != nil || len(foreign) != 0 {
		t.Fatal("foreign list", e)
	}
	if e = repo.Moderate(ctx, id, 2, "approved"); e != nil {
		t.Fatal(e)
	}
	visible, e := repo.Reviews(ctx, false)
	if e != nil || len(visible) != 1 {
		t.Fatal("approved not public", e)
	}
	input.Consent = false
	if e = repo.UpdateReview(ctx, 1, 1, input); e != nil {
		t.Fatal(e)
	}
	visible, e = repo.Reviews(ctx, false)
	if e != nil || len(visible) != 0 {
		t.Fatal("revoked still public", e)
	}
	exec(`UPDATE checkout_orders SET status='cancelled',stock_debited=false WHERE id=1`)
	if e = repo.UpdateReview(ctx, 1, 1, input); !errors.Is(e, sql.ErrNoRows) {
		t.Fatal("cancelled edit allowed", e)
	}
	r, e = repo.OrderReview(ctx, 1, 1)
	if e != nil || r == nil || r.ID != id || r.CanEdit {
		t.Fatal("cancelled history lost/editable", e)
	}
	conn, e := db.Conn(ctx)
	if e != nil {
		t.Fatal(e)
	}
	defer conn.Close()
	if _, e = conn.ExecContext(ctx, migration("000056_purchase_review_topics.down.sql")); e == nil {
		t.Fatal("rollback lost review topics")
	}
	_, _ = conn.ExecContext(ctx, "ROLLBACK")
	var count int
	if e = db.QueryRow(`SELECT cardinality(topics) FROM purchase_experience_reviews WHERE id=$1`, id).Scan(&count); e != nil || count != 2 {
		t.Fatal("rejected rollback changed data", e)
	}
}
