package routes

import (
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"errors"
	"testing"
	"time"
)

func TestFinalRepositoriesPostgres(t *testing.T) {
	db, exec := checkoutTestDB(t)
	ctx := context.Background()
	exec(`ALTER TABLE products ADD COLUMN description text,ADD COLUMN care_instructions text,ADD COLUMN measurements jsonb DEFAULT '{}',ADD COLUMN brand_id integer,ADD COLUMN product_type_id integer,ADD COLUMN purchase_summary text,ADD COLUMN sku text;
 CREATE SEQUENCE final_product_id_seq START 100;ALTER TABLE products ALTER COLUMN id SET DEFAULT nextval('final_product_id_seq');
 ALTER TABLE product_images ADD COLUMN sort_order integer DEFAULT 0;
 ALTER TABLE promotions ADD COLUMN name text DEFAULT 'Campaign',ADD COLUMN description text DEFAULT '',ADD COLUMN image_path text DEFAULT '',ADD COLUMN home_featured boolean DEFAULT false,ADD COLUMN created_at timestamptz DEFAULT now(),ADD COLUMN updated_at timestamptz DEFAULT now();
 CREATE SEQUENCE final_promotion_id_seq START 100;ALTER TABLE promotions ALTER COLUMN id SET DEFAULT nextval('final_promotion_id_seq');
 UPDATE products SET quantity=10;
 DELETE FROM cart_items;`)
	products := repositories.ProductRepository{DB: db}
	cart := repositories.CartRepository{DB: db}
	promotions := repositories.PromotionRepository{DB: db}
	t.Run("variant_metadata_creation_edit_and_overflow", func(t *testing.T) {
		id, err := products.Create(ctx, models.Product{Name: "Metadata", Price: 20, Quantity: 3, Status: "active", Variants: []models.ProductVariant{{Size: "Queen", Dimensions: "220 x 240", Price: 20, Stock: 3, IncludedItems: []string{"Fronha"}, Simulated: true}}})
		if err != nil {
			t.Fatal(err)
		}
		var variantID int64
		var included string
		var simulated bool
		if err = db.QueryRow(`SELECT id,included_items::text,simulated FROM product_variants WHERE product_id=$1`, id).Scan(&variantID, &included, &simulated); err != nil || included != `["Fronha"]` || !simulated {
			t.Fatal("metadata not stored", err)
		}
		expected := []models.ProductVariant{{ID: variantID, Size: "Queen", Dimensions: "220 x 240", Price: 20, Stock: 3}}
		changed := append([]models.ProductVariant{}, expected...)
		changed[0].Price = 21
		actual, err := products.SaveVariants(ctx, int64(id), changed, expected)
		if err != nil || len(actual) != 1 || len(actual[0].IncludedItems) != 1 || !actual[0].Simulated {
			t.Fatal("metadata lost on editor omission", err)
		}
		huge := append([]models.ProductVariant{}, actual...)
		huge[0].Stock = 2147483647
		huge = append(huge, models.ProductVariant{Size: "Casal", Price: 20, Stock: 1, Dimensions: "200 x 220"})
		if _, err = products.SaveVariants(ctx, int64(id), huge, actual); !errors.Is(err, repositories.ErrVariantConflict) {
			t.Fatal("variant sum overflow accepted", err)
		}
		var stock int
		if err = db.QueryRow(`SELECT quantity FROM products WHERE id=$1`, id).Scan(&stock); err != nil || stock != 3 {
			t.Fatal("variant overflow persisted", err)
		}
	})
	t.Run("gallery_sort_order_and_invalid_cart_variant", func(t *testing.T) {
		exec(`INSERT INTO product_images(id,product_id,image_path,is_primary,sort_order) VALUES(10,1,'old.jpg',false,2),(11,1,'ordered.jpg',false,1)`)
		state, err := cart.Apply(ctx, 1, repositories.CartAdd, 1, 1)
		if err != nil || state.Items[0].Image != "ordered.jpg" {
			t.Fatal("gallery sort ignored", err)
		}
		exec(`INSERT INTO product_variants(id,product_id,size,price,quantity) VALUES(31,1,'Queen',10,5)`)
		state, err = cart.Apply(ctx, 1, repositories.CartGet, 0, 0)
		if err != nil || state.Items[0].Available {
			t.Fatal("missing required variant shown available", err)
		}
		exec(`ALTER TABLE cart_items DROP CONSTRAINT cart_items_variant_product_fk;UPDATE cart_items SET variant_id=999 WHERE cart_id=(SELECT id FROM carts WHERE user_id=1)`)
		state, err = cart.Apply(ctx, 1, repositories.CartGet, 0, 0)
		if err != nil || state.Items[0].Available {
			t.Fatal("invalid variant shown available", err)
		}
		exec(`DELETE FROM cart_items;DELETE FROM product_variants WHERE id=31`)
	})
	t.Run("campaign_participants_snapshot_and_legacy_duplicates", func(t *testing.T) {
		exec(`INSERT INTO promotions(id,name,status,start_date,end_date) VALUES(1,'One','active',now()-interval '1 day',now()+interval '1 day'),(2,'Empty','active',now()-interval '1 day',now()+interval '1 day');
 INSERT INTO promotion_products(product_id,promotion_id,promotional_price) VALUES(1,1,9),(1,1,8)`)
		list, err := promotions.ListCampaigns(ctx)
		if err != nil || len(list) != 2 {
			t.Fatal(err)
		}
		for _, campaign := range list {
			if campaign.Products == nil {
				t.Fatal("nil participants")
			}
			if campaign.ID == 1 {
				if len(*campaign.Products) != 1 || (*campaign.Products)[0].PromotionalPrice == nil || *(*campaign.Products)[0].PromotionalPrice != 8 {
					t.Fatal("legacy aggregation changed")
				}
			} else if len(*campaign.Products) != 0 {
				t.Fatal("empty campaign")
			}
		}
	})
	t.Run("promotion_rechecks_locked_product_price", func(t *testing.T) {
		tx, err := db.BeginTx(ctx, nil)
		if err != nil {
			t.Fatal(err)
		}
		defer tx.Rollback()
		if _, err = tx.Exec(`UPDATE products SET price=5 WHERE id=1`); err != nil {
			t.Fatal(err)
		}
		done := make(chan error, 1)
		go func() {
			done <- promotions.AddProduct(ctx, 1, models.AddToPromotionRequest{ProductID: 1, PromotionalPrice: 7})
		}()
		select {
		case err := <-done:
			t.Fatalf("price not locked: %v", err)
		case <-time.After(100 * time.Millisecond):
		}
		if err = tx.Commit(); err != nil {
			t.Fatal(err)
		}
		if err = <-done; !errors.Is(err, repositories.ErrCampaignInvalid) {
			t.Fatal("stale promotional validation", err)
		}
		var count int
		if err = db.QueryRow(`SELECT count(*) FROM promotion_products WHERE promotion_id=1 AND promotional_price=7`).Scan(&count); err != nil || count != 0 {
			t.Fatal("invalid promotion persisted", err)
		}
	})
}
