package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/services"
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"github.com/golang-jwt/jwt/v5"
	"image"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"strings"
	"testing"
	"time"
)

func TestHomePostgres(t *testing.T) {
	d, e := openTestDatabase(t)
	if e != nil {
		t.Fatal(e)
	}
	defer d.Close()
	d.SetMaxOpenConns(1)
	schema := fmt.Sprintf("home_test_%d", time.Now().UnixNano())
	exec := func(q string) {
		t.Helper()
		if _, e := d.Exec(q); e != nil {
			t.Fatal(e)
		}
	}
	exec("CREATE SCHEMA " + schema)
	defer d.Exec("DROP SCHEMA " + schema + " CASCADE")
	exec("SET search_path TO " + schema)
	mig := func(n, dir string) string {
		b, e := os.ReadFile("../../migrations/" + n + "." + dir + ".sql")
		if e != nil {
			t.Fatal(e)
		}
		return string(b)
	}
	for _, n := range []string{"000001_initial_schema", "000002_simplify_customer_registration", "000003_cart", "000006_checkout", "000051_order_shipping", "000053_checkout_installments", "000007_order_cancellation", "000013_product_variants", "000024_catalog_brand_editorial", "000048_product_external_sku", "000045_home_experience_campaigns"} {
		exec(mig(n, "up"))
	}
	exec(mig("000049_promotion_timestamps", "up"))
	exec(mig("000045_home_experience_campaigns", "down"))
	exec(mig("000045_home_experience_campaigns", "up"))
	exec(mig("000052_purchase_review_optional_criteria", "up"))
	exec(`INSERT INTO users(id,full_name,email,password,role) VALUES(1,'Comprador','home1@example.test','unused','customer'),(2,'Outro','home2@example.test','unused','customer'),(3,'Admin','home3@example.test','unused','admin');INSERT INTO products(id,name,price,quantity,status) VALUES(1,'Mais estoque',10,100,'active'),(2,'Mais vendido',20,1,'active'),(3,'Inativo',50,20,'inactive');INSERT INTO product_variants(id,product_id,size,price,quantity) VALUES(1,2,'Casal',20,1),(2,2,'Queen',40,0);`)
	repo := repositories.HomeRepository{DB: d}
	p, s, e := repo.Highlights(context.Background())
	if e != nil || s || len(p) != 2 {
		t.Fatal("fallback", e)
	}
	exec(`INSERT INTO checkout_orders(user_id,request_key,address,payment_method,status,total_cents,stock_debited) VALUES(1,'valid','{}','pix','simulated_approved',10000,true),(1,'cancelled','{}','pix','cancelled',10000,false),(1,'not-debited','{}','pix','simulated_approved',10000,false);INSERT INTO checkout_order_items(order_id,product_id,name,quantity,unit_price_cents,variant_id) VALUES(1,2,'Casal',2,2000,1),(1,2,'Queen',3,4000,2),(1,1,'Outro',1,1000,NULL),(1,3,'Inativo',100,5000,NULL),(2,1,'Cancelado',100,1000,NULL),(3,1,'Sem baixa',100,1000,NULL);`)
	for _, test := range []struct {
		user    int
		total   int
		filters models.OrderFilters
	}{{1, 3, models.OrderFilters{}}, {1, 1, models.OrderFilters{CancelledOnly: true}}, {1, 1, models.OrderFilters{Search: "#1"}}, {1, 1, models.OrderFilters{Search: "Casal"}}, {2, 0, models.OrderFilters{}}} {
		n, e := (repositories.CheckoutRepository{DB: d}).CountOrders(context.Background(), test.user, test.filters)
		if e != nil || n != test.total {
			t.Fatal("order pagination count", n, e)
		}
	}
	p, s, e = repo.Highlights(context.Background())
	if e != nil || !s || len(p) != 2 || p[0].ID != 2 {
		t.Fatal("sales ranking", e)
	}
	assetDir := t.TempDir()
	file, e := os.Create(assetDir + "/asset.png")
	if e != nil {
		t.Fatal(e)
	}
	png.Encode(file, image.NewRGBA(image.Rect(0, 0, 2, 2)))
	file.Close()
	mux := http.NewServeMux()
	InitRoutesHome(mux, handlers.HomeHandler{Store: repo})
	InitRoutesReviews(mux, handlers.HomeHandler{Store: repo})
	InitRoutesPromotions(mux, handlers.PromotionHandler{Service: services.PromotionService{Store: repositories.PromotionRepository{DB: d}, UploadDir: assetDir}}, handlers.ProductHandler{})
	t.Setenv("JWT_SECRET", "favorites-tests-only")
	token := func(id int, role string) string {
		v, e := jwt.NewWithClaims(jwt.SigningMethodHS256, models.Claims{UserID: id, Role: role, RegisteredClaims: jwt.RegisteredClaims{Issuer: "box-enxovais-api", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}}).SignedString([]byte("favorites-tests-only"))
		if e != nil {
			t.Fatal(e)
		}
		return v
	}
	call := func(method, path, body, auth string, want int) *httptest.ResponseRecorder {
		t.Helper()
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		if auth != "" {
			req.Header.Set("Authorization", "Bearer "+auth)
		}
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)
		if w.Code != want {
			t.Fatalf("%s %s got %d: %s", method, path, w.Code, w.Body.String())
		}
		return w
	}
	customer := token(1, "customer")
	admin := token(3, "admin")
	body := `{"overall":5,"navigation":4,"service":3,"experience":5,"comment":"Boa experiência","publicationConsent":true,"status":"approved"}`
	call("POST", "/orders/1/review", body, "", 401)
	call("POST", "/orders/1/review", body, token(2, "customer"), 404)
	call("POST", "/orders/2/review", body, customer, 404)
	call("POST", "/orders/3/review", body, customer, 404)
	call("POST", "/orders/1/review", `{"overall":6}`, customer, 400)
	call("POST", "/orders/1/review", body, customer, 201)
	call("POST", "/orders/1/review", body, customer, 409)
	if call("GET", "/home/reviews", "", "", 200).Body.String() != "[]\n" {
		t.Fatal("pending published")
	}
	call("GET", "/admin/experience-reviews", "", customer, 403)
	call("PATCH", "/admin/experience-reviews/1", `{"status":"approved"}`, customer, 403)
	call("PATCH", "/admin/experience-reviews/1", `{"status":"approved"}`, admin, 200)
	var public []map[string]any
	json.Unmarshal(call("GET", "/home/reviews", "", "", 200).Body.Bytes(), &public)
	if len(public) != 1 || public[0]["publicationConsent"] != true || public[0]["orderId"] != nil || public[0]["email"] != nil || public[0]["user_id"] != nil {
		t.Fatal("privacy")
	}
	exec("UPDATE purchase_experience_reviews SET publication_consent=false")
	if call("GET", "/home/reviews", "", "", 200).Body.String() != "[]\n" {
		t.Fatal("consent ignored")
	}
	exec("UPDATE purchase_experience_reviews SET publication_consent=true;UPDATE checkout_orders SET status='cancelled' WHERE id=1")
	if call("GET", "/home/reviews", "", "", 200).Body.String() != "[]\n" {
		t.Fatal("cancelled review published")
	}
	call("PATCH", "/admin/experience-reviews/1", `{"status":"rejected"}`, admin, 200)
	exec(`INSERT INTO promotions(name,status,start_date,end_date,description,image_path,home_featured) VALUES('Natal','active',now()-interval '1 day',now()+interval '1 day','Natal cadastrado','uploads/natal.webp',true);INSERT INTO promotion_products(promotion_id,product_id,promotional_price) VALUES(1,1,8),(1,2,10);`)
	campaign, e := repo.Campaign(context.Background())
	if e != nil || campaign == nil || len(campaign.Products) != 2 || campaign.Products[0].PromotionalPrice != 8 {
		t.Fatal("campaign", e)
	}
	exec("UPDATE promotions SET end_date=now()-interval '1 second'")
	campaign, e = repo.Campaign(context.Background())
	if e != nil || campaign != nil {
		t.Fatal("expired campaign")
	}
	start := time.Now().Add(-time.Hour).Format(time.RFC3339)
	end := time.Now().Add(time.Hour).Format(time.RFC3339)
	create := fmt.Sprintf(`{"name":"Natal valida","status":"active","start_date":%q,"end_date":%q,"description":"Campanha configurada","image_path":"uploads/asset.png","home_featured":true}`, start, end)
	call("POST", "/api/promotions/create", create, "", 401)
	call("POST", "/api/promotions/create", create, customer, 403)
	call("POST", "/api/promotions/create", strings.Replace(create, "uploads/asset.png", "uploads/../asset.png", 1), admin, 400)
	call("POST", "/api/promotions/create", strings.Replace(create, end, start, 1), admin, 400)
	call("POST", "/api/promotions/create", create, admin, 201)
	call("POST", "/api/promotions/add", `{"promotion_name":"Natal valida","product_id":1,"promotional_price":8}`, customer, 403)
	call("POST", "/api/promotions/add", `{"promotion_name":"Natal valida","product_id":2,"promotional_price":8}`, admin, 400)
	call("POST", "/api/promotions/add", `{"promotion_name":"Natal valida","product_id":1,"promotional_price":10}`, admin, 400)
	call("POST", "/api/promotions/add", `{"promotion_name":"Natal valida","product_id":1,"promotional_price":8}`, admin, 201)
	campaign, e = repo.Campaign(context.Background())
	if e != nil || campaign == nil || campaign.Description != "Campanha configurada" {
		t.Fatal("stored campaign metadata", e)
	}

	call("POST", "/admin/promotions/image", "", "", 401)
	call("POST", "/admin/promotions/image", "", customer, 403)
	var imageBody bytes.Buffer
	writer := multipart.NewWriter(&imageBody)
	part, err := writer.CreateFormFile("image", "campaign.png")
	if err != nil {
		t.Fatal(err)
	}
	if err = png.Encode(part, image.NewRGBA(image.Rect(0, 0, 2, 2))); err != nil {
		t.Fatal(err)
	}
	writer.Close()
	uploadRequest := httptest.NewRequest("POST", "/admin/promotions/image", &imageBody)
	uploadRequest.Header.Set("Content-Type", writer.FormDataContentType())
	uploadRequest.Header.Set("Authorization", "Bearer "+admin)
	uploadResponse := httptest.NewRecorder()
	mux.ServeHTTP(uploadResponse, uploadRequest)
	if uploadResponse.Code != 201 {
		t.Fatal("campaign upload", uploadResponse.Code, uploadResponse.Body.String())
	}
	var uploaded map[string]string
	json.Unmarshal(uploadResponse.Body.Bytes(), &uploaded)
	if !strings.HasPrefix(uploaded["image_path"], "uploads/campaign_") {
		t.Fatal("invalid upload path")
	}
	if _, err = os.Stat(assetDir + "/asset.png"); err != nil {
		t.Fatal("existing asset removed")
	}
	call("GET", "/admin/promotions", "", "", 401)
	call("GET", "/admin/promotions", "", customer, 403)
	call("GET", "/admin/promotions", "", admin, 200)
	edit := strings.TrimSuffix(create, "}") + `,"products":[{"product_id":1,"promotional_price":7.50},{"product_id":2}]}`
	call("PUT", "/admin/promotions/2", edit, customer, 403)
	call("PUT", "/admin/promotions/2", edit, admin, 200)
	call("PUT", "/admin/promotions/2", strings.Replace(edit, `{"product_id":2}`, `{"product_id":2,"promotional_price":1}`, 1), admin, 400)
	call("PUT", "/admin/promotions/2", strings.Replace(edit, `"promotional_price":7.50`, `"promotional_price":-1`, 1), admin, 400)

	for _, members := range []string{`[{"product_id":999999}]`, `[{"product_id":3}]`, `[{"product_id":1},{"product_id":1}]`} {
		var invalid map[string]any
		json.Unmarshal([]byte(edit), &invalid)
		var participants any
		json.Unmarshal([]byte(members), &participants)
		invalid["products"] = participants
		body, _ := json.Marshal(invalid)
		call("PUT", "/admin/promotions/2", string(body), admin, 400)
	}
	detail := call("GET", "/campaigns/2", "", "", 200)
	var publicCampaign models.HomeCampaign
	if json.Unmarshal(detail.Body.Bytes(), &publicCampaign) != nil || len(publicCampaign.Products) != 2 || publicCampaign.Products[0].PromotionalPrice != 7.5 {
		t.Fatal("campaign selection or rollback lost")
	}
	stored, err := (repositories.ProductRepository{DB: d}).Get(context.Background(), 1)
	if err != nil || len(stored) != 1 || !stored[0].PromotionActive || stored[0].PromotionalPrice != 7.5 {
		t.Fatal("public price", err)
	}
	call("PUT", "/admin/promotions/2", strings.Replace(edit, `"status":"active"`, `"status":"inactive"`, 1), admin, 200)
	call("GET", "/campaigns/2", "", "", 404)
	call("PUT", "/admin/promotions/2", edit, admin, 200)
	exec("UPDATE promotion_products SET promotional_price=0 WHERE promotion_id=(SELECT id FROM promotions WHERE name='Natal valida')")
	var encoded map[string]any
	json.Unmarshal(call("GET", "/home/campaign", "", "", 200).Body.Bytes(), &encoded)
	if encoded["products"].([]any)[0].(map[string]any)["promotional_price"] != float64(0) {
		t.Fatal("zero discount lost")
	}

	var emptyRequest models.CreatePromotionRequest
	if err = json.Unmarshal([]byte(edit), &emptyRequest); err != nil {
		t.Fatal(err)
	}
	noParticipants := []models.PromotionParticipant{}
	emptyRequest.Products = &noParticipants
	emptyBody, _ := json.Marshal(emptyRequest)
	newEmpty := emptyRequest
	newEmpty.Name = "Campanha vazia"
	newEmptyBody, _ := json.Marshal(newEmpty)
	call("POST", "/api/promotions/create", string(newEmptyBody), admin, 201)

	call("PUT", "/admin/promotions/2", string(emptyBody), admin, 200)
	if string(call("GET", "/home/campaign", "", "", 200).Body.Bytes()) != "null\n" {
		t.Fatal("empty campaign rendered")
	}
	call("GET", "/campaigns/2", "", "", 404)
	var records []models.PromotionRecord
	if err = json.Unmarshal(call("GET", "/admin/promotions", "", admin, 200).Body.Bytes(), &records); err != nil {
		t.Fatal(err)
	}
	for _, record := range records {
		if record.ID == 2 && (record.Products == nil || len(*record.Products) != 0) {
			t.Fatal("empty campaign participants not persisted")
		}
	}
	call("PUT", "/admin/promotions/2", edit, admin, 200)
	call("PUT", "/admin/promotions/2", strings.Replace(edit, `"home_featured":true`, `"home_featured":false`, 1), admin, 200)
	if string(call("GET", "/home/campaign", "", "", 200).Body.Bytes()) != "null\n" {
		t.Fatal("unmarked campaign rendered")
	}
	call("PUT", "/admin/promotions/2", edit, admin, 200)

	exec(`INSERT INTO product_types(id,name) VALUES(1,'Decoração');UPDATE products SET product_type_id=1,measurements='{"Tipo":"Tapetes para quarto e sala"}'::jsonb WHERE id=1;INSERT INTO product_images(product_id,image_path,is_primary) VALUES(1,'uploads/decor-room.webp',true);`)
	var categories []map[string]string
	json.Unmarshal(call("GET", "/home/categories", "", "", 200).Body.Bytes(), &categories)
	if len(categories) != 6 || categories[5]["imagePath"] != "uploads/decor-room.webp" {
		t.Fatal("category photography")
	}

}

func TestHomeFeaturedPostgres(t *testing.T) {
	d, err := openTestDatabase(t)
	if err != nil {
		t.Fatal(err)
	}
	defer d.Close()
	d.SetMaxOpenConns(1)
	schema := fmt.Sprintf("home_featured_%d", time.Now().UnixNano())
	exec := func(q string) {
		t.Helper()
		if _, err := d.Exec(q); err != nil {
			t.Fatal(err)
		}
	}
	exec("CREATE SCHEMA " + schema)
	defer d.Exec("DROP SCHEMA " + schema + " CASCADE")
	exec("SET search_path TO " + schema)
	for _, name := range []string{"000001_initial_schema", "000002_simplify_customer_registration", "000003_cart", "000006_checkout", "000051_order_shipping", "000053_checkout_installments", "000007_order_cancellation", "000013_product_variants", "000024_catalog_brand_editorial", "000048_product_external_sku"} {
		data, err := os.ReadFile("../../migrations/" + name + ".up.sql")
		if err != nil {
			t.Fatal(err)
		}
		exec(string(data))
	}
	exec(`INSERT INTO product_types(id,name) VALUES(101,'Cama / Jogos de cama'),(102,'Cama / Edredons'),(103,'Travesseiros'),(104,'Toalhas'),(105,'Almofadas'),(106,'Mesa'),(107,'Decoração');
 INSERT INTO products(id,name,price,quantity,status,product_type_id) VALUES
 (101,'Jogo ativo',100,0,'active',101),(102,'Edredom da mesma categoria',200,8,'active',102),
 (103,'Travesseiro inativo',50,8,'inactive',103),(104,'Travesseiro disponível',60,8,'active',103),
 (105,'Toalha sem estoque',30,0,'active',104),(106,'Toalha com variante',40,99,'active',104),
 (107,'Almofada',20,8,'active',105),(108,'Mesa',30,8,'active',106),
 (109,'Tapete 1',40,8,'active',107),(110,'Tapete 2',45,8,'active',107);
 INSERT INTO product_variants(product_id,size,price,quantity) VALUES(101,'Queen',110,2),(106,'Único',42,0);`)
	repo := repositories.HomeRepository{DB: d}
	check := func(want []int64) {
		t.Helper()
		products, err := repo.Featured(context.Background())
		if err != nil || len(products) != len(want) {
			t.Fatalf("featured: %v, count %d", err, len(products))
		}
		for i, product := range products {
			if product.ID != want[i] || product.Status != "active" || product.Quantity <= 0 {
				t.Fatalf("featured position %d: %+v", i, product)
			}
		}
	}
	check([]int64{101, 104, 107, 108})
	check([]int64{101, 104, 107, 108})
	mux := http.NewServeMux()
	InitRoutesHome(mux, handlers.HomeHandler{Store: repo})
	InitRoutesReviews(mux, handlers.HomeHandler{Store: repo})
	response := httptest.NewRecorder()
	mux.ServeHTTP(response, httptest.NewRequest("GET", "/home/featured", nil))
	var payload struct {
		Products []models.Product `json:"products"`
	}
	if response.Code != 200 || json.Unmarshal(response.Body.Bytes(), &payload) != nil || len(payload.Products) != 4 {
		t.Fatal("featured contract", response.Code, response.Body.String())
	}
	exec("UPDATE products SET status='inactive' WHERE product_type_id NOT IN(101,102)")
	check([]int64{101, 102})
	exec("UPDATE product_variants SET quantity=0; UPDATE products SET quantity=0")
	check([]int64{})
}
