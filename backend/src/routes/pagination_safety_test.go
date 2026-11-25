package routes

import (
	"backend/src/pagination"
	"context"
	"database/sql"
	"net/url"
	"testing"
)

func TestPaginationReadPageSafetyPostgres(t *testing.T) {
	db, _ := checkoutTestDB(t)
	ctx := context.Background()
	t.Run("base_arguments_before_filter", func(t *testing.T) {
		query, err := pagination.ParsePage(url.Values{"name__contains": {"Prod"}, "limit": {"1"}}, map[string]pagination.FilterField{"name": {Column: "page.name", Kind: pagination.FilterText}}, 2)
		if err != nil {
			t.Fatal(err)
		}
		page, err := pagination.ReadPage[string](ctx, db, `SELECT name,id FROM products WHERE price>=$1`, []any{0}, query, "page.id", func(rows *sql.Rows) (string, error) {
			var name string
			var id int
			err := rows.Scan(&name, &id)
			return name, err
		})
		if err != nil || len(page.Items) != 1 || page.Items[0] != "Produto" || page.Pagination.Total != 1 {
			t.Fatal(page, err)
		}
		if _, err := pagination.ReadPage[string](ctx, db, `SELECT name,id FROM products`, nil, query, "page.id", func(*sql.Rows) (string, error) { return "", nil }); err == nil {
			t.Fatal("mismatched first parameter accepted")
		}
	})
	t.Run("repeatable_read_read_only", func(t *testing.T) {
		page, err := pagination.ReadPage[string](ctx, db, `SELECT 1 AS id,current_setting('transaction_isolation') AS isolation,current_setting('transaction_read_only') AS readonly`, nil, pagination.PageQuery{Limit: 1}, "page.id", func(rows *sql.Rows) (string, error) {
			var id int
			var isolation, readonly string
			err := rows.Scan(&id, &isolation, &readonly)
			return isolation + "/" + readonly, err
		})
		if err != nil || len(page.Items) != 1 || page.Items[0] != "repeatable read/on" {
			t.Fatal(page, err)
		}
	})
}
