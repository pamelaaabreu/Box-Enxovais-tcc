package routes

import (
	"backend/src/config"
	"backend/src/db"
	"backend/src/handlers"
	"backend/src/repositories"
	"backend/src/services"
	"context"
	"database/sql"
	"fmt"
	"golang.org/x/crypto/bcrypt"
	"image"
	"image/color"
	"image/png"
	"net"
	"net/http"
	"net/url"
	"os"
	"path/filepath"
	"strconv"
	"testing"
	"time"
)

func TestBrowserAuditServer(t *testing.T) {
	if os.Getenv("AUDIT_BROWSER") != "1" {
		t.Skip("opt-in isolated browser audit")
	}
	cfg, err := config.Load("../../.env")
	if err != nil {
		t.Fatal("configuration unavailable")
	}
	base, err := db.Open(context.Background(), cfg.Database)
	if err != nil {
		t.Fatal("test database unavailable")
	}
	defer base.Close()
	commercialDigest := func() string {
		t.Helper()
		var digest string
		err := base.QueryRow(`SELECT md5(COALESCE(string_agg(entry, '' ORDER BY entry), '')) FROM (
 SELECT 'products' || row_to_json(p)::text AS entry FROM public.products p
 UNION ALL SELECT 'users' || row_to_json(u)::text FROM public.users u
 UNION ALL SELECT 'addresses' || row_to_json(a)::text FROM public.user_addresses a
 UNION ALL SELECT 'variants' || row_to_json(v)::text FROM public.product_variants v
 UNION ALL SELECT 'images' || row_to_json(i)::text FROM public.product_images i
 UNION ALL SELECT 'promotions' || row_to_json(p)::text FROM public.promotions p
 UNION ALL SELECT 'participants' || row_to_json(p)::text FROM public.promotion_products p
 UNION ALL SELECT 'cart' || row_to_json(c)::text FROM public.cart_items c
 UNION ALL SELECT 'orders' || row_to_json(o)::text FROM public.checkout_orders o
 UNION ALL SELECT 'items' || row_to_json(i)::text FROM public.checkout_order_items i
 UNION ALL SELECT 'cancellations' || row_to_json(c)::text FROM public.order_cancellations c
 UNION ALL SELECT 'shipping' || row_to_json(s)::text FROM public.shipping_ranges s
 UNION ALL SELECT 'reviews' || row_to_json(r)::text FROM public.purchase_experience_reviews r
 UNION ALL SELECT 'migration' || row_to_json(m)::text FROM public.schema_migrations m
) commercial`).Scan(&digest)
		if err != nil {
			t.Fatal("principal commercial integrity check unavailable")
		}
		return digest
	}
	var version int
	var dirty bool
	if err = base.QueryRow("SELECT version,dirty FROM public.schema_migrations").Scan(&version, &dirty); err != nil || dirty {
		t.Fatal("principal migration state unavailable or dirty")
	}
	t.Logf("PRIMARY_MIGRATION_%d_DIRTY_%t", version, dirty)
	before := commercialDigest()
	defer func() {
		if commercialDigest() != before {
			t.Error("principal commercial state changed during audit")
		} else {
			t.Log("PRIMARY_COMMERCIAL_STATE_UNCHANGED")
		}
	}()
	schema := fmt.Sprintf("browser_audit_%d", time.Now().UnixNano())
	if _, err = base.Exec("CREATE SCHEMA " + schema); err != nil {
		t.Fatal(err)
	}
	defer func() {
		if _, err := base.Exec("DROP SCHEMA " + schema + " CASCADE"); err != nil {
			t.Error("isolated schema cleanup failed")
			return
		}
		var remaining int
		if err := base.QueryRow("SELECT count(*) FROM pg_namespace WHERE nspname=$1", schema).Scan(&remaining); err != nil || remaining != 0 {
			t.Error("isolated schema remains")
			return
		}
		t.Log("ISOLATED_SCHEMA_REMOVED")
	}()
	dsn := url.URL{Scheme: "postgres", User: url.UserPassword(cfg.Database.User, cfg.Database.Password), Host: net.JoinHostPort(cfg.Database.Host, strconv.Itoa(cfg.Database.Port)), Path: "/" + cfg.Database.Name}
	query := url.Values{"sslmode": {cfg.Database.SSLMode}, "search_path": {schema}}
	dsn.RawQuery = query.Encode()
	database, err := sql.Open("postgres", dsn.String())
	if err != nil {
		t.Fatal("isolated pool unavailable")
	}
	defer database.Close()
	var active string
	if err = database.QueryRow("SELECT current_schema()").Scan(&active); err != nil || active != schema {
		t.Fatal("isolation check failed")
	}
	run := func(q string) {
		t.Helper()
		if _, err := database.Exec(q); err != nil {
			t.Fatal(err)
		}
	}
	for _, name := range []string{"000001_initial_schema", "000002_simplify_customer_registration", "000003_cart", "000004_products_quantity_nonnegative", "000005_favorites", "000006_checkout", "000051_order_shipping", "000053_checkout_installments", "000007_order_cancellation", "000008_order_cancellation_reason", "000009_account_addresses", "000010_business_phone", "000011_user_cnpj", "000012_shipping_ranges", "000013_product_variants", "000024_catalog_brand_editorial", "000045_home_experience_campaigns", "000048_product_external_sku", "000049_promotion_timestamps", "000050_product_image_order", "000052_purchase_review_optional_criteria"} {
		migration, e := os.ReadFile("../../migrations/" + name + ".up.sql")
		if e != nil {
			t.Fatal(e)
		}
		run(string(migration))
	}
	if os.Getenv("SHIPPING_PR_BROWSER") == "1" {
		seed, e := os.ReadFile("../../../db/seeds/shipping-pr-20261121.sql")
		if e != nil {
			t.Fatal(e)
		}
		run(string(seed))
	}
	hash, err := bcrypt.GenerateFromPassword([]byte("AuditOnly2026!"), bcrypt.DefaultCost)
	if err != nil {
		t.Fatal(err)
	}
	for _, u := range []struct{ name, email, role string }{{"Admin Auditoria", "admin@audit.example.test", "admin"}, {"Cliente Auditoria", "cliente@audit.example.test", "customer"}} {
		if _, err = database.Exec("INSERT INTO users(full_name,email,password,role) VALUES($1,$2,$3,$4)", u.name, u.email, string(hash), u.role); err != nil {
			t.Fatal(err)
		}
	}
	run(`INSERT INTO brands(name) VALUES('Box Enxovais'); INSERT INTO product_types(name) VALUES('Cama / Jogos de cama'),('Cama / Edredons'),('Travesseiros'),('Toalhas'),('Almofadas'),('Mesa'),('Decoração / Tapetes');
 INSERT INTO products(name,description,purchase_summary,care_instructions,measurements,price,quantity,brand_id,product_type_id,status) VALUES
 ('Jogo de Cama Auditoria Algodão','Jogo de cama para testes isolados.','Algodão macio.','Lavar delicadamente.','{"Material":"100% algodão","Cor":"Areia"}',129.90,12,1,1,'active'),
 ('Edredom Auditoria Variantes','Edredom para testes isolados.','Toque macio.','Secar à sombra.','{"Material":"Microfibra","Cor":"Oliva"}',249.90,7,1,2,'active'),
 ('Travesseiro Auditoria','Travesseiro sem capa.','Tecido suave.','Higienização especializada.','{"Material":"Poliéster"}',89.90,4,1,3,'active'),
 ('Toalha Auditoria','Toalha de banho.','Algodão.','Lavar delicadamente.','{}',59.90,5,1,4,'active'),
 ('Almofada Auditoria','Capa de almofada.','Textura macia.','Lavar manualmente.','{}',49.90,3,1,5,'active'),
 ('Mesa Auditoria','Jogo americano.','Quatro peças.','Lavar delicadamente.','{}',69.90,2,1,6,'active'),
 ('Tapete Auditoria','Tapete de banheiro.','Uma peça.','Lavar delicadamente.','{}',39.90,0,1,7,'active');
 INSERT INTO product_variants(product_id,size,price,quantity,dimensions,included_items,simulated) VALUES(2,'Casal',249.90,3,'220 × 240 cm','["1 edredom"]',true),(2,'Queen',289.90,4,'240 × 260 cm','["1 edredom"]',true);`)
	if os.Getenv("PRODUCT_CRUD_BROWSER") == "1" {
		run(`INSERT INTO brands(name) VALUES('Marca Edição');
 INSERT INTO checkout_orders(user_id,request_key,address,payment_method,total_cents) VALUES(2,'crud-linked-order','{}','pix',12990);
 INSERT INTO checkout_order_items(order_id,product_id,name,quantity,unit_price_cents) SELECT id,1,'Jogo de Cama Auditoria Algodão',1,12990 FROM checkout_orders WHERE request_key='crud-linked-order';`)
	}
	if os.Getenv("ADMIN_ORDERS_BROWSER") == "1" {
		run(`INSERT INTO checkout_orders(user_id,request_key,address,payment_method,total_cents,created_at,stock_debited)
 SELECT 2,'orders-browser-'||n,'{"recipient":"Cliente Auditoria","street":"Rua de Testes","number":"123","neighborhood":"Centro","zipCode":"01001000","city":"São Paulo","state":"SP"}'::jsonb,CASE WHEN n%2=0 THEN 'card' ELSE 'pix' END,CASE WHEN n=13 THEN 2500 ELSE 12990 END,'2026-11-01 12:00:00+00'::timestamptz+n*interval '1 day',n<>2 FROM generate_series(1,13)n;
 INSERT INTO checkout_order_items(order_id,product_id,name,quantity,unit_price_cents,variant_id)
 SELECT id,CASE WHEN id=13 THEN 2 ELSE 1 END,CASE WHEN id=13 THEN 'Edredom Histórico — Queen' ELSE 'Jogo de Cama Histórico Algodão' END,1,CASE WHEN id=13 THEN 2500 ELSE 12990 END,CASE WHEN id=13 THEN 2 ELSE NULL END FROM checkout_orders;
 UPDATE checkout_orders SET status='cancelled' WHERE id=3;
 INSERT INTO order_cancellations(order_id,reason_code,cancelled_by) VALUES(3,'changed_mind',2);
 UPDATE products SET price=999 WHERE id=1;`)
	}
	if os.Getenv("ADMIN_CUSTOMERS_BROWSER") == "1" {
		run(`INSERT INTO users(full_name,email,password,role,created_at)
 SELECT 'Cliente Cadastro '||n,'cadastro'||n||'@audit.example.test','not-a-login-hash','customer','2026-01-01'::timestamptz+n*interval '1 day' FROM generate_series(1,12)n;
 UPDATE users SET phone='11999990000',created_at='2025-12-01' WHERE id=2;
 INSERT INTO user_addresses(user_id,label,recipient,zip_code,street,number,complement,neighborhood,city,state,is_default)
 VALUES(2,'Casa','Cliente Auditoria','01001000','Rua de Testes','123','Apto 10','Centro','São Paulo','SP',true),(3,'Outro endereço','Cliente Cadastro 1','01001000','Rua Outra','9','','Centro','São Paulo','SP',true);
 INSERT INTO checkout_orders(user_id,request_key,address,payment_method,total_cents,created_at,stock_debited)
 SELECT CASE WHEN n=14 THEN 3 ELSE 2 END,'customer-browser-'||n,'{"recipient":"Cliente Auditoria","street":"Rua de Testes","number":"123","zipCode":"01001000","city":"São Paulo","state":"SP"}'::jsonb,'pix',CASE WHEN n=2 THEN 9000 ELSE 1000 END,'2026-02-01'::timestamptz+n*interval '1 day',true FROM generate_series(1,14)n;
 INSERT INTO checkout_order_items(order_id,product_id,name,quantity,unit_price_cents) SELECT id,1,'Produto Histórico',1,total_cents FROM checkout_orders;
 UPDATE checkout_orders SET status='cancelled' WHERE id=2;
 INSERT INTO order_cancellations(order_id,reason_code,cancelled_by) VALUES(2,'changed_mind',2);`)
	}
	if os.Getenv("DASHBOARD_BROWSER") == "1" {
		run(`UPDATE users SET created_at=now() WHERE role='customer';
 UPDATE products SET quantity=999,price=999 WHERE id=2;
 UPDATE products SET status='inactive' WHERE id=4;
 INSERT INTO checkout_orders(user_id,request_key,address,payment_method,total_cents,created_at,stock_debited,status) VALUES
 (2,'metrics-approved','{"recipient":"Cliente Auditoria"}','pix',1001,now()-interval '2 days',true,'simulated_approved'),
 (2,'metrics-archived','{"recipient":"Cliente Auditoria"}','pix',2100,now()-interval '1 day',true,'simulated_approved'),
 (2,'metrics-cancelled','{"recipient":"Cliente Auditoria"}','pix',9000,now(),true,'cancelled');
 INSERT INTO checkout_order_items(order_id,product_id,name,quantity,unit_price_cents) SELECT id,CASE WHEN request_key='metrics-archived' THEN 4 ELSE 1 END,CASE WHEN request_key='metrics-archived' THEN 'Produto histórico arquivado' ELSE 'Produto histórico' END,CASE WHEN request_key='metrics-archived' THEN 3 ELSE 1 END,CASE WHEN request_key='metrics-archived' THEN 700 ELSE total_cents END FROM checkout_orders;
 INSERT INTO order_cancellations(order_id,reason_code,cancelled_by) SELECT id,'changed_mind',2 FROM checkout_orders WHERE status='cancelled';`)
	}
	if os.Getenv("REPORTS_BROWSER") == "1" {
		run(`INSERT INTO users(full_name,email,password,role,created_at) VALUES('Cliente Sem Compras','semcompras@audit.example.test','no-login','customer',now());
 UPDATE products SET name='=Produto para CSV' WHERE id=5;
 INSERT INTO checkout_orders(user_id,request_key,address,payment_method,total_cents,created_at,status) SELECT 2,'reports-'||n,'{}','pix',100,now()-interval '1 hour','simulated_approved' FROM generate_series(1,22) n;
 INSERT INTO checkout_order_items(order_id,product_id,name,quantity,unit_price_cents) SELECT id,2,'Edredom histórico Queen',1,100 FROM checkout_orders WHERE request_key LIKE 'reports-%';`)
	}
	assets := t.TempDir()
	img := image.NewRGBA(image.Rect(0, 0, 400, 300))
	for y := 0; y < 300; y++ {
		for x := 0; x < 400; x++ {
			img.Set(x, y, color.RGBA{210, 199, 175, 255})
		}
	}
	file, e := os.Create(filepath.Join(assets, "audit-product.png"))
	if e != nil {
		t.Fatal(e)
	}
	if e = png.Encode(file, img); e != nil {
		t.Fatal(e)
	}
	file.Close()
	fixture, err := os.ReadFile(filepath.Join(assets, "audit-product.png"))
	if err != nil {
		t.Fatal(err)
	}
	if err = os.WriteFile(filepath.Join(assets, "audit-detail.png"), fixture, 0600); err != nil {
		t.Fatal(err)
	}
	run("INSERT INTO product_images(product_id,image_path,is_primary) SELECT id,'uploads/audit-product.png',true FROM products")
	run("INSERT INTO product_images(product_id,image_path,is_primary) VALUES(2,'uploads/audit-detail.png',false)")
	t.Setenv("JWT_SECRET", "isolated-browser-audit-only")
	userRepo := repositories.UserRepository{DB: database}
	products := handlers.ProductHandler{Service: services.ProductService{Store: repositories.ProductRepository{DB: database}}}
	mux := http.NewServeMux()
	InitRoutesAuth(mux, handlers.AuthHandler{Service: services.AuthService{Store: userRepo, JWTSecret: os.Getenv("JWT_SECRET"), RecoveryEmail: func(email, code string) error {
		return os.WriteFile("../../audit-browser.otp", []byte(code), 0600)
	}}}, handlers.UserHandler{Service: services.UserService{Store: userRepo}})
	InitRoutesProducts(mux, products, handlers.ProductImageHandler{Service: services.ProductImageService{Store: repositories.ProductImageRepository{DB: database}, Directory: assets}})
	InitRoutesDashboard(mux, products)
	InitRoutesReports(mux, products)
	InitRoutesCart(mux, handlers.CartHandler{Store: repositories.CartRepository{DB: database}})
	InitRoutesFavorites(mux, handlers.FavoritesHandler{Service: services.FavoritesService{Store: repositories.FavoritesRepository{DB: database}}})
	InitRoutesHome(mux, handlers.HomeHandler{Store: repositories.HomeRepository{DB: database}})
	InitRoutesReviews(mux, handlers.HomeHandler{Store: repositories.HomeRepository{DB: database}})
	InitRoutesShipping(mux, handlers.QuoteShipping(database), handlers.ListShippingRanges(database), handlers.SaveShippingRange(database), handlers.DeleteShippingRange(database))
	InitRoutesPromotions(mux, handlers.PromotionHandler{Service: services.PromotionService{Store: repositories.PromotionRepository{DB: database}, UploadDir: assets}}, products)
	orders := handlers.OrderHistoryHandler{Store: repositories.CheckoutRepository{DB: database}}
	InitRoutesAdminCustomers(mux, handlers.AdminCustomerHandler{Service: services.AdminCustomerService{Store: repositories.AdminCustomerRepository{DB: database}}})
	InitRoutesAdminOrders(mux, handlers.AdminOrdersHandler{Store: repositories.CheckoutRepository{DB: database}})
	InitRoutesOrders(mux, orders)
	checkout := handlers.CheckoutHandler{Store: repositories.CheckoutRepository{DB: database}}
	InitRoutesCheckout(mux, checkout)
	account := handlers.AccountHandler{Store: repositories.AccountRepository{DB: database}}
	InitRoutesAccount(mux, account)
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", http.FileServer(http.Dir(assets))))
	server := http.Server{Addr: "127.0.0.1:8086", Handler: http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if origin := r.Header.Get("Origin"); origin == "http://localhost:4200" || origin == "http://127.0.0.1:4206" {
			w.Header().Set("Access-Control-Allow-Origin", origin)
		}
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS")
		if r.Method == "OPTIONS" {
			w.WriteHeader(200)
			return
		}
		mux.ServeHTTP(w, r)
	}), ReadHeaderTimeout: 5 * time.Second}
	listener, err := net.Listen("tcp", server.Addr)
	if err != nil {
		t.Fatal(err)
	}
	defer server.Close()
	defer os.Remove("../../audit-browser.stop")
	defer os.Remove("../../audit-browser.otp")
	go server.Serve(listener)
	t.Log("ISOLATED_BROWSER_READY", schema)
	deadline := time.After(35 * time.Minute)
	ticker := time.NewTicker(250 * time.Millisecond)
	defer ticker.Stop()
	for {
		select {
		case <-deadline:
			t.Fatal("browser audit timeout")
		case <-ticker.C:
			if _, err := os.Stat("../../audit-browser.stop"); err == nil {
				return
			}
		}
	}
}
