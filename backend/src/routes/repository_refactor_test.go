package routes

import (
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"database/sql"
	"errors"
	"golang.org/x/crypto/bcrypt"
	"os"
	"testing"
	"time"
)

func TestRepositoryRefactorPostgres(t *testing.T) {
	db, exec := checkoutTestDB(t)
	ctx := context.Background()
	exec(`ALTER TABLE users ADD COLUMN password text; ALTER TABLE users ADD COLUMN role text DEFAULT 'customer';
 UPDATE users SET email='account-'||id||'@example.test',full_name='Conta '||id,password='unchanged';
 CREATE TABLE subscribers(email text UNIQUE NOT NULL);
 CREATE TABLE favorites(user_id integer REFERENCES users(id),product_id integer REFERENCES products(id),PRIMARY KEY(user_id,product_id));`)
	migration, err := os.ReadFile("../../migrations/000055_normalized_contact_keys.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	exec(string(migration))
	account := repositories.AccountRepository{DB: db}
	cart := repositories.CartRepository{DB: db}
	favorites := repositories.FavoritesRepository{DB: db}
	t.Run("profile_omitted_empty_filled_and_safe_values", func(t *testing.T) {
		exec(`UPDATE users SET phone='11988887777',birth_date='2000-01-01',national_id='12345678901' WHERE id=1`)
		name := "Cliente ' ; --"
		empty := ""
		profile, err := account.UpdateProfile(ctx, 1, models.AccountProfilePatch{Name: &name, Phone: &empty})
		if err != nil || profile.Name != name || profile.Phone != "" || profile.BirthDate != "2000-01-01" || profile.NationalID != "12345678901" {
			t.Fatal("patch semantics", err)
		}
		profile, err = account.UpdateProfile(ctx, 1, models.AccountProfilePatch{BirthDate: &empty, NationalID: &empty})
		if err != nil || profile.BirthDate != "" || profile.NationalID != "" {
			t.Fatal("clear fields", err)
		}
		exec(`CREATE UNIQUE INDEX test_full_name_key ON users(full_name)`)
		other := "Conta 2"
		_, err = account.UpdateProfile(ctx, 1, models.AccountProfilePatch{Name: &other})
		if err == nil || errors.Is(err, repositories.ErrDuplicateCPF) {
			t.Fatal("unrelated unique violation classified as CPF", err)
		}
	})
	t.Run("normalized_cpf_competing_accounts", func(t *testing.T) {
		cpf := "123.456.789-01"
		results := checkoutParallel(func() error {
			_, err := account.UpdateProfile(ctx, 1, models.AccountProfilePatch{NationalID: &cpf})
			return err
		}, func() error {
			_, err := account.UpdateProfile(ctx, 2, models.AccountProfilePatch{NationalID: &cpf})
			return err
		})
		wins, conflicts := 0, 0
		for _, err := range results {
			if err == nil {
				wins++
			} else if errors.Is(err, repositories.ErrDuplicateCPF) {
				conflicts++
			} else {
				t.Fatal(err)
			}
		}
		if wins != 1 || conflicts != 1 {
			t.Fatal("CPF duplicated")
		}
	})
	t.Run("concurrent_addresses_default_delete_owner", func(t *testing.T) {
		address := models.UserAddress{Label: "Casa", ShippingAddress: models.ShippingAddress{Recipient: "Pessoa", ZipCode: "87502100", Street: "Rua", Number: "1", Neighborhood: "Centro", City: "Umuarama", State: "PR"}}
		results := checkoutParallel(func() error { _, err := account.SaveAddress(ctx, 1, 0, address); return err }, func() error { _, err := account.SaveAddress(ctx, 1, 0, address); return err })
		for _, err := range results {
			if err != nil {
				t.Fatal(err)
			}
		}
		list, err := account.Addresses(ctx, 1)
		if err != nil || len(list) != 2 || !list[0].IsDefault || list[1].IsDefault {
			t.Fatal("first default", err)
		}
		if err = account.SetDefaultAddress(ctx, 1, list[1].ID); err != nil {
			t.Fatal(err)
		}
		if err = account.DeleteAddress(ctx, 2, list[1].ID); !errors.Is(err, sql.ErrNoRows) {
			t.Fatal("owner bypass", err)
		}
		if err = account.DeleteAddress(ctx, 1, list[1].ID); err != nil {
			t.Fatal(err)
		}
		list, err = account.Addresses(ctx, 1)
		if err != nil || len(list) != 1 || !list[0].IsDefault {
			t.Fatal("default not replaced", err)
		}
	})
	t.Run("favorites_duplicate_and_inactive_idempotence", func(t *testing.T) {
		for _, err := range checkoutParallel(func() error { return favorites.Add(ctx, 1, 1) }, func() error { return favorites.Add(ctx, 1, 1) }) {
			if err != nil {
				t.Fatal(err)
			}
		}
		var count int
		if err := db.QueryRow(`SELECT count(*) FROM favorites`).Scan(&count); err != nil || count != 1 {
			t.Fatal("duplicate favorite", err)
		}
		exec(`UPDATE products SET status='inactive' WHERE id=1`)
		if err := favorites.Add(ctx, 1, 1); err != nil {
			t.Fatal("existing inactive favorite not idempotent", err)
		}
		if err := favorites.Add(ctx, 2, 1); !errors.Is(err, repositories.ErrFavoriteProductUnavailable) {
			t.Fatal(err)
		}
		if err := favorites.Add(ctx, 1, 999); !errors.Is(err, repositories.ErrFavoriteProductNotFound) {
			t.Fatal(err)
		}
		exec(`DELETE FROM favorites; UPDATE products SET status='active' WHERE id=1`)
	})
	t.Run("deactivation_lock_blocks_favorites_and_cart", func(t *testing.T) {
		for _, attempt := range []func() error{func() error { return favorites.Add(ctx, 1, 1) }, func() error { _, err := cart.Apply(ctx, 1, repositories.CartAdd, 1, 1); return err }} {
			tx, err := db.BeginTx(ctx, nil)
			if err != nil {
				t.Fatal(err)
			}
			if _, err = tx.Exec(`UPDATE products SET status='inactive' WHERE id=1`); err != nil {
				tx.Rollback()
				t.Fatal(err)
			}
			done := make(chan error, 1)
			go func() { done <- attempt() }()
			select {
			case err := <-done:
				tx.Rollback()
				t.Fatalf("FOR SHARE did not wait: %v", err)
			case <-time.After(100 * time.Millisecond):
			}
			if err = tx.Commit(); err != nil {
				t.Fatal(err)
			}
			select {
			case err := <-done:
				if !errors.Is(err, repositories.ErrCartProduct) && !errors.Is(err, repositories.ErrFavoriteProductUnavailable) {
					t.Fatal("inactive accepted", err)
				}
			case <-time.After(5 * time.Second):
				t.Fatal("operation blocked after commit")
			}
			exec(`UPDATE products SET status='active' WHERE id=1`)
		}
	})
	t.Run("cart_concurrency_variants_and_isolation", func(t *testing.T) {
		exec(`DELETE FROM cart_items; UPDATE products SET quantity=20 WHERE id=1`)
		for _, err := range checkoutParallel(func() error { _, err := cart.Apply(ctx, 1, repositories.CartAdd, 1, 1); return err }, func() error { _, err := cart.Apply(ctx, 1, repositories.CartAdd, 1, 1); return err }) {
			if err != nil {
				t.Fatal(err)
			}
		}
		state, err := cart.Apply(ctx, 1, repositories.CartGet, 0, 0)
		if err != nil || state.TotalItems != 2 {
			t.Fatal("lost addition", err)
		}
		itemID := state.Items[0].ID
		for _, err := range checkoutParallel(func() error { _, err := cart.Apply(ctx, 1, repositories.CartUpdate, itemID, 3); return err }, func() error { _, err := cart.Apply(ctx, 1, repositories.CartUpdate, itemID, 4); return err }) {
			if err != nil {
				t.Fatal(err)
			}
		}
		state, err = cart.Apply(ctx, 1, repositories.CartGet, 0, 0)
		if err != nil || (state.TotalItems != 3 && state.TotalItems != 4) {
			t.Fatal("update should replace", err)
		}
		if _, err = cart.Apply(ctx, 2, repositories.CartUpdate, itemID, 1); !errors.Is(err, repositories.ErrCartItemNotFound) {
			t.Fatal("cross user", err)
		}
		if _, err = cart.Apply(ctx, 1, repositories.CartAdd, 1, 1, -1); !errors.Is(err, repositories.ErrCartProduct) {
			t.Fatal("negative variant", err)
		}
		if _, err = cart.Apply(ctx, 1, repositories.CartAdd, 1, 0); !errors.Is(err, repositories.ErrCartQuantity) {
			t.Fatal("zero quantity", err)
		}
		if _, err = cart.Apply(ctx, 1, repositories.CartAdd, 1, 21); !errors.Is(err, repositories.ErrCartQuantity) {
			t.Fatal("stock classification", err)
		}
		again, err := cart.Apply(ctx, 1, repositories.CartGet, 0, 0)
		if err != nil || again.TotalItems != state.TotalItems {
			t.Fatal("failed write not rolled back", err)
		}
	})
	t.Run("images_and_promotion_priority", func(t *testing.T) {
		exec(`DELETE FROM cart_items;
   INSERT INTO product_variants(id,product_id,size,price,quantity) VALUES(31,1,'Queen',12,5);
   INSERT INTO products(id,name,price,quantity,status) VALUES(2,'Simples',20,5,'active');
   INSERT INTO product_images(id,product_id,image_path,is_primary,variant_id) VALUES(101,1,'general.jpg',true,NULL),(102,1,'variant.jpg',false,31),(103,1,'variant-cover.jpg',true,31);
   INSERT INTO promotions(id,status,start_date,end_date) VALUES(1,'active',now()-interval '1 day',now()+interval '1 day'),(2,'inactive',now()-interval '1 day',now()+interval '1 day'),(3,'active',now()+interval '1 day',now()+interval '2 days');
   INSERT INTO promotion_products(product_id,promotion_id,promotional_price) VALUES(1,1,8),(2,1,15),(2,2,1),(2,3,2);`)
		state, err := cart.Apply(ctx, 1, repositories.CartAdd, 1, 1, 31)
		if err != nil || state.Items[0].Image != "variant-cover.jpg" || state.Items[0].UnitPrice != 1200 {
			t.Fatal("variant image/price changed", err)
		}
		state, err = cart.Apply(ctx, 1, repositories.CartAdd, 2, 1)
		if err != nil || state.Items[1].Image != "" || state.Items[1].UnitPrice != 1500 {
			t.Fatal("simple promotion/image fallback", err)
		}
		exec(`DELETE FROM product_images WHERE variant_id=31`)
		state, err = cart.Apply(ctx, 1, repositories.CartGet, 0, 0)
		if err != nil || state.Items[0].Image != "general.jpg" {
			t.Fatal("general fallback", err)
		}
	})
	t.Run("normalized_email_hash_and_subscriptions", func(t *testing.T) {
		users := repositories.UserRepository{DB: db}
		subscribers := repositories.SubscriberRepository{DB: db}
		exec(`CREATE SEQUENCE test_users_id_seq START 10; ALTER TABLE users ALTER COLUMN id SET DEFAULT nextval('test_users_id_seq')`)
		hash, err := bcrypt.GenerateFromPassword([]byte("test-password"), bcrypt.MinCost)
		if err != nil {
			t.Fatal(err)
		}
		if err = users.Create(ctx, models.CreateUserRequest{Name: "Cliente", Email: "  NEW@EXAMPLE.TEST  "}, string(hash)); err != nil {
			t.Fatal(err)
		}
		found, err := users.FindByEmail(ctx, " New@Example.Test ")
		if err != nil || found.ID != 10 || found.Email != "new@example.test" || bcrypt.CompareHashAndPassword([]byte(found.Password), []byte("test-password")) != nil {
			t.Fatal("email/hash persistence", err)
		}
		if err = users.UpdatePasswordByEmail(ctx, "updated-hash", " NEW@EXAMPLE.TEST "); err != nil {
			t.Fatal(err)
		}
		if err = users.UpdatePasswordByEmail(ctx, "unused", "missing@example.test"); !errors.Is(err, sql.ErrNoRows) {
			t.Fatal("missing identity", err)
		}
		if err = subscribers.Save(ctx, " News@Example.Test "); err != nil {
			t.Fatal(err)
		}
		if err = subscribers.Save(ctx, "news@example.test"); err != nil {
			t.Fatal(err)
		}
		var count int
		if err = db.QueryRow(`SELECT count(*) FROM subscribers`).Scan(&count); err != nil || count != 1 {
			t.Fatal("duplicate subscription", err)
		}
		if _, err = db.Exec(`INSERT INTO subscribers(email) VALUES(' NEWS@example.test ')`); err == nil {
			t.Fatal("normalized database uniqueness missing")
		}
	})
}

func TestNormalizedContactMigrationPostgres(t *testing.T) {
	db, exec := checkoutTestDB(t)
	ctx := context.Background()
	exec(`ALTER TABLE users ADD COLUMN password text DEFAULT 'unchanged';ALTER TABLE users ADD COLUMN role text DEFAULT 'customer';CREATE TABLE subscribers(email text UNIQUE NOT NULL)`)
	users := repositories.UserRepository{DB: db}
	if _, err := users.FindByEmail(ctx, "test@example.com"); !errors.Is(err, repositories.ErrUnexpectedRows) {
		t.Fatal("ambiguous login accepted", err)
	}
	if _, err := users.GetUserEmail(ctx, "test@example.com"); !errors.Is(err, repositories.ErrUnexpectedRows) {
		t.Fatal("ambiguous recovery accepted", err)
	}
	if err := users.UpdatePasswordByEmail(ctx, "must-not-persist", "test@example.com"); !errors.Is(err, repositories.ErrUnexpectedRows) {
		t.Fatal("ambiguous password update", err)
	}
	var count int
	if err := db.QueryRow(`SELECT count(*) FROM users WHERE password='unchanged'`).Scan(&count); err != nil || count != 2 {
		t.Fatal("failed password update did not roll back", err)
	}
	up, err := os.ReadFile("../../migrations/000055_normalized_contact_keys.up.sql")
	if err != nil {
		t.Fatal(err)
	}
	connection, err := db.Conn(ctx)
	if err != nil {
		t.Fatal(err)
	}
	defer connection.Close()
	reject := func() {
		t.Helper()
		if _, err := connection.ExecContext(ctx, string(up)); err == nil {
			t.Fatal("duplicate migration accepted")
		}
		if _, err := connection.ExecContext(ctx, "ROLLBACK"); err != nil {
			t.Fatal(err)
		}
		var index sql.NullString
		if err := connection.QueryRowContext(ctx, `SELECT to_regclass('users_email_normalized_key')::text`).Scan(&index); err != nil || index.Valid {
			t.Fatal("partial migration persisted", err)
		}
	}
	reject()
	if _, err = connection.ExecContext(ctx, `UPDATE users SET email='user-'||id||'@example.test',national_id=CASE id WHEN 1 THEN '123.456.789-01' ELSE '12345678901' END`); err != nil {
		t.Fatal(err)
	}
	reject()
	if _, err = connection.ExecContext(ctx, `UPDATE users SET national_id=NULL WHERE id=2`); err != nil {
		t.Fatal(err)
	}
	for _, direction := range []string{"up", "down", "up"} {
		raw, err := os.ReadFile("../../migrations/000055_normalized_contact_keys." + direction + ".sql")
		if err != nil {
			t.Fatal(err)
		}
		if _, err = connection.ExecContext(ctx, string(raw)); err != nil {
			t.Fatal(err)
		}
	}
	var cpf string
	if err = connection.QueryRowContext(ctx, `SELECT national_id FROM users WHERE id=1`).Scan(&cpf); err != nil || cpf != "123.456.789-01" {
		t.Fatal("migration changed existing data", err)
	}
}
func TestCartQuantityOverflowPostgres(t *testing.T) {
	db, exec := checkoutTestDB(t)
	ctx := context.Background()
	cart := repositories.CartRepository{DB: db}
	exec(`ALTER TABLE cart_items ALTER COLUMN quantity TYPE bigint; ALTER TABLE cart_items DROP CONSTRAINT cart_items_quantity_check;UPDATE cart_items SET quantity=9223372036854775807 WHERE cart_id=(SELECT id FROM carts WHERE user_id=1)`)
	if _, err := cart.Apply(ctx, 1, repositories.CartAdd, 1, 1); !errors.Is(err, repositories.ErrCartQuantity) {
		t.Fatal("quantity addition overflow", err)
	}
	var quantity int64
	if err := db.QueryRow(`SELECT quantity FROM cart_items WHERE cart_id=(SELECT id FROM carts WHERE user_id=1)`).Scan(&quantity); err != nil || quantity != 9223372036854775807 {
		t.Fatal("overflow mutation persisted", err)
	}
	if _, err := cart.Apply(ctx, 1, repositories.CartGet, 0, 0); err == nil {
		t.Fatal("subtotal overflow accepted")
	}
}
