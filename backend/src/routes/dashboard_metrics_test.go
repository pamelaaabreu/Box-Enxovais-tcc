package routes

import (
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"testing"
	"time"
)

func TestDashboardMetricsPostgres(t *testing.T) {
	db, exec := checkoutTestDB(t)
	exec(`ALTER TABLE users ADD COLUMN role text NOT NULL DEFAULT 'customer';ALTER TABLE users ADD COLUMN created_at timestamptz;
 UPDATE users SET role=CASE id WHEN 2 THEN 'admin' ELSE 'customer' END,created_at='2026-01-01T03:00:00Z';INSERT INTO users(id,created_at) VALUES(3,'2026-01-01T02:59:59Z');
 CREATE TABLE product_types(id integer PRIMARY KEY,name text);INSERT INTO product_types VALUES(1,'Cama');ALTER TABLE products ADD COLUMN product_type_id integer;UPDATE products SET quantity=5,price=999,product_type_id=1;
 INSERT INTO products(id,name,price,quantity,status,product_type_id) VALUES(2,'Nome alterado',999,1,'inactive',1),(3,'Sem estoque',10,0,'active',1),(4,'Com variações',10,100,'active',1),(5,'Variação indisponível',10,100,'active',1),(6,'Disponível',10,100,'active',1);
 INSERT INTO product_variants(product_id,size,price,quantity,dimensions) VALUES(4,'Casal',10,1,'A'),(4,'Queen',20,2,'B'),(5,'Casal',10,0,'A'),(5,'Queen',20,10,'B');
 INSERT INTO checkout_orders(user_id,request_key,address,payment_method,status,total_cents,created_at) VALUES
 (3,'before','{}','pix','simulated_approved',99999,'2026-01-01T02:59:59Z'),
 (1,'start','{}','pix','simulated_approved',1001,'2026-01-01T03:00:00Z'),
 (1,'same-day','{}','pix','simulated_approved',1000,'2026-01-01T04:00:00Z'),
 (1,'archived','{}','pix','simulated_approved',2100,'2026-01-15T12:00:00Z'),
 (1,'cancelled','{}','pix','cancelled',9000,'2026-01-20T12:00:00Z'),
 (1,'last-second','{}','pix','simulated_approved',3000,'2026-02-01T02:59:59Z'),
 (1,'after','{}','pix','simulated_approved',88888,'2026-02-01T03:00:00Z');
 INSERT INTO checkout_order_items(order_id,product_id,name,quantity,unit_price_cents) SELECT id,CASE WHEN request_key='archived' THEN 2 ELSE 1 END,CASE WHEN request_key='archived' THEN 'Nome histórico arquivado' ELSE 'Produto histórico' END,CASE WHEN request_key='archived' THEN 3 WHEN status='cancelled' THEN 9 ELSE 1 END,CASE WHEN request_key='archived' THEN 700 ELSE total_cents END FROM checkout_orders;`)
	loc, _ := time.LoadLocation("America/Sao_Paulo")
	period := models.DashboardPeriod{Preset: "custom", From: time.Date(2026, 1, 1, 0, 0, 0, 0, loc), Until: time.Date(2026, 2, 1, 0, 0, 0, 0, loc), Group: "day", Timezone: "America/Sao_Paulo"}
	repo := repositories.ProductRepository{DB: db}
	data, e := repo.Dashboard(context.Background(), period)
	if e != nil {
		t.Fatal(e)
	}
	t.Run("historical_revenue_ticket_status_and_timezone", func(t *testing.T) {
		if data.Orders != 5 || data.ApprovedOrders != 4 || data.CancelledOrders != 1 || data.RevenueCents != 7101 || data.AverageTicketCents != 1775 {
			t.Fatalf("incorrect financial metrics: %+v", data)
		}
	})
	t.Run("current_inventory_variants_and_customers", func(t *testing.T) {
		if data.Products != 6 || data.ActiveProducts != 5 || data.LowStock != 2 || data.OutOfStock != 1 || data.Customers != 2 || data.NewCustomers != 1 || data.CustomersWithOrders != 2 {
			t.Fatalf("incorrect current metrics: %+v", data)
		}
	})
	t.Run("series_matches_cards_with_zero_gaps", func(t *testing.T) {
		points := data.Series
		if len(points) != 31 {
			t.Fatal("daily calendar mismatch")
		}
		var orders, revenue, clients int64
		for _, p := range points {
			orders += p.Orders
			revenue += p.RevenueCents
			clients += p.Customers
		}
		if orders != data.Orders || revenue != data.RevenueCents || clients != data.NewCustomers || points[1].Orders != 0 {
			t.Fatal("series differs from cards")
		}
	})
	t.Run("archived_products_keep_historical_name_and_units", func(t *testing.T) {
		top := data.TopProducts
		if len(top) != 2 || top[1].ProductID == nil || *top[1].ProductID != 2 || top[1].Units != 3 || top[1].Name != "Nome histórico arquivado" || !top[1].Archived {
			t.Fatalf("incorrect ranking: %+v", data.TopProducts)
		}
	})
	t.Run("individual_variant_stock_and_no_catalog_price_recalculation", func(t *testing.T) {
		stock := data.Stock
		found := false
		for _, p := range stock {
			if p.ProductID == 5 && p.Quantity == 0 && p.TotalQuantity == 10 {
				found = true
			}
		}
		if !found {
			t.Fatal("missing unavailable variant")
		}
	})
	t.Run("monthly_group_and_half_up_rounding", func(t *testing.T) {
		p := period
		p.Group = "month"
		monthly, e := repo.Dashboard(context.Background(), p)
		if e != nil {
			t.Fatal(e)
		}
		points := monthly.Series
		if len(points) != 1 || monthly.RevenueCents != 7101 {
			t.Fatal("monthly grouping mismatch")
		}
		p = period
		p.Until = p.From.AddDate(0, 0, 1)
		day, e := repo.Dashboard(context.Background(), p)
		if e != nil || day.AverageTicketCents != 1001 {
			t.Fatal("ticket must round half up in cents", e)
		}
	})
	t.Run("empty_period_does_not_hide_current_stock", func(t *testing.T) {
		p := period
		p.From = p.From.AddDate(1, 0, 0)
		p.Until = p.Until.AddDate(1, 0, 0)
		empty, e := repo.Dashboard(context.Background(), p)
		if e != nil || empty.Orders != 0 || empty.RevenueCents != 0 || empty.AverageTicketCents != 0 || empty.NewCustomers != 0 || empty.LowStock != data.LowStock || empty.Customers != 2 {
			t.Fatal("empty period metrics mismatch", e)
		}
	})
}
