package routes

import (
	"context"
	"database/sql"
	"os"
	"testing"
	"time"

	"github.com/lib/pq"
)

func TestInstallmentsDownConcurrencyPostgres(t *testing.T) {
	d, exec := checkoutTestDB(t)
	read := func(direction string) string {
		b, err := os.ReadFile("../../migrations/000053_checkout_installments." + direction + ".sql")
		if err != nil {
			t.Fatal(err)
		}
		return string(b)
	}
	down, up := read("down"), read("up")
	exec(down)
	for _, name := range []string{"000045_home_experience_campaigns.up.sql", "000052_purchase_review_optional_criteria.up.sql"} {
		b, err := os.ReadFile("../../migrations/" + name)
		if err != nil {
			t.Fatal(err)
		}
		exec(string(b))
	}
	exec(up)
	exec(`INSERT INTO checkout_orders(user_id,request_key,address,payment_method,total_cents) VALUES(1,'rollback-race','{}','card',2291)`)
	check := func(wantColumn bool, wantPlan sql.NullInt64) {
		t.Helper()
		var exists bool
		if err := d.QueryRow(`SELECT EXISTS(SELECT 1 FROM information_schema.columns WHERE table_schema=current_schema() AND table_name='checkout_orders' AND column_name='installments')`).Scan(&exists); err != nil || exists != wantColumn {
			t.Fatalf("column exists=%v, expected %v: %v", exists, wantColumn, err)
		}
		var total int
		if err := d.QueryRow(`SELECT total_cents FROM checkout_orders WHERE request_key='rollback-race'`).Scan(&total); err != nil || total != 2291 {
			t.Fatalf("historical total changed: %v", err)
		}
		if wantColumn {
			var plan sql.NullInt64
			if err := d.QueryRow(`SELECT installments FROM checkout_orders WHERE request_key='rollback-race'`).Scan(&plan); err != nil || plan != wantPlan {
				t.Fatalf("plan=%v expected %v: %v", plan, wantPlan, err)
			}
			var constraint bool
			if err := d.QueryRow(`SELECT EXISTS(SELECT 1 FROM pg_constraint WHERE conrelid='checkout_orders'::regclass AND conname='checkout_order_installments_valid')`).Scan(&constraint); err != nil || !constraint {
				t.Fatalf("constraint lost: %v", err)
			}
		}
	}
	requireCode := func(err error, code string) {
		t.Helper()
		pg, ok := err.(*pq.Error)
		if !ok || string(pg.Code) != code {
			t.Fatalf("expected PostgreSQL %s, received %v", code, err)
		}
	}
	t.Run("without recorded installments", func(t *testing.T) {
		if _, err := d.Exec(down); err != nil {
			t.Fatal(err)
		}
		check(false, sql.NullInt64{})
		exec(up)
	})
	t.Run("existing plan refuses rollback atomically", func(t *testing.T) {
		exec(`UPDATE checkout_orders SET installments=6`)
		_, err := d.Exec(down)
		requireCode(err, "P0001")
		check(true, sql.NullInt64{Int64: 6, Valid: true})
		_, err = d.Exec(`UPDATE checkout_orders SET installments=7`)
		requireCode(err, "23514")
		exec(`UPDATE checkout_orders SET installments=NULL`)
	})
	t.Run("writer commits before rollback lock", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		writer, err := d.Conn(ctx)
		if err != nil {
			t.Fatal(err)
		}
		defer writer.Close()
		migration, err := d.Conn(ctx)
		if err != nil {
			t.Fatal(err)
		}
		defer migration.Close()
		var pid int
		if err = migration.QueryRowContext(ctx, "SELECT pg_backend_pid()").Scan(&pid); err != nil {
			t.Fatal(err)
		}
		tx, err := writer.BeginTx(ctx, nil)
		if err != nil {
			t.Fatal(err)
		}
		defer tx.Rollback()
		if _, err = tx.ExecContext(ctx, `UPDATE checkout_orders SET installments=6`); err != nil {
			t.Fatal(err)
		}
		done := make(chan error, 1)
		go func() { _, e := migration.ExecContext(ctx, down); done <- e }()
		waitInstallmentLock(t, ctx, tx, pid, "AccessExclusiveLock")
		if err = tx.Commit(); err != nil {
			t.Fatal(err)
		}
		select {
		case err = <-done:
			requireCode(err, "P0001")
		case <-ctx.Done():
			t.Fatal(ctx.Err())
		}
		writer.Close()
		migration.Close()
		check(true, sql.NullInt64{Int64: 6, Valid: true})
		exec(`UPDATE checkout_orders SET installments=NULL`)
	})
	t.Run("rollback holds lock through column removal", func(t *testing.T) {
		ctx, cancel := context.WithTimeout(context.Background(), 15*time.Second)
		defer cancel()
		migration, err := d.Conn(ctx)
		if err != nil {
			t.Fatal(err)
		}
		defer migration.Close()
		writer, err := d.Conn(ctx)
		if err != nil {
			t.Fatal(err)
		}
		defer writer.Close()
		var pid int
		if err = writer.QueryRowContext(ctx, "SELECT pg_backend_pid()").Scan(&pid); err != nil {
			t.Fatal(err)
		}
		tx, err := migration.BeginTx(ctx, nil)
		if err != nil {
			t.Fatal(err)
		}
		defer tx.Rollback()
		if _, err = tx.ExecContext(ctx, down); err != nil {
			t.Fatal(err)
		}
		done := make(chan error, 1)
		go func() { _, e := writer.ExecContext(ctx, `UPDATE checkout_orders SET installments=6`); done <- e }()
		waitInstallmentLock(t, ctx, tx, pid, "RowExclusiveLock")
		if err = tx.Commit(); err != nil {
			t.Fatal(err)
		}
		select {
		case err = <-done:
			requireCode(err, "42703")
		case <-ctx.Done():
			t.Fatal(ctx.Err())
		}
		migration.Close()
		writer.Close()
		check(false, sql.NullInt64{})
		exec(up)
		check(true, sql.NullInt64{})
	})
}

func waitInstallmentLock(t *testing.T, ctx context.Context, tx *sql.Tx, pid int, mode string) {
	t.Helper()
	for {
		var waiting bool
		err := tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM pg_locks WHERE pid=$1 AND relation='checkout_orders'::regclass AND mode=$2 AND NOT granted)`, pid, mode).Scan(&waiting)
		if err != nil {
			t.Fatal(err)
		}
		if waiting {
			return
		}
		select {
		case <-ctx.Done():
			t.Fatal("expected table lock wait", ctx.Err())
		case <-time.After(10 * time.Millisecond):
		}
	}
}
