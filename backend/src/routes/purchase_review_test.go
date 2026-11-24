package routes

import (
	"backend/src/handlers"
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"encoding/json"
	"github.com/golang-jwt/jwt/v5"
	"net/http"
	"net/http/httptest"
	"os"
	"strconv"
	"strings"
	"testing"
	"time"
)

func TestPurchaseReviewPostgres(t *testing.T) {
	d, exec := checkoutTestDB(t)
	migration := func(name, dir string) string {
		v, e := os.ReadFile("../../migrations/" + name + "." + dir + ".sql")
		if e != nil {
			t.Fatal(e)
		}
		return string(v)
	}
	exec(migration("000045_home_experience_campaigns", "up"))
	exec("INSERT INTO checkout_orders(user_id,request_key,address,payment_method,total_cents,stock_debited) VALUES(1,'legacy-review','{}','pix',1000,true);INSERT INTO purchase_experience_reviews(order_id,user_id,overall,navigation,service,experience,comment) VALUES(1,1,4,3,2,5,'Opinião anterior')")
	exec(migration("000052_purchase_review_optional_criteria", "up"))
	exec(migration("000052_purchase_review_optional_criteria", "down"))
	exec(migration("000052_purchase_review_optional_criteria", "up"))
	var original string
	var score int
	if e := d.QueryRow("SELECT comment,navigation FROM purchase_experience_reviews WHERE order_id=1").Scan(&original, &score); e != nil || original != "Opinião anterior" || score != 3 {
		t.Fatal("legacy review changed", e)
	}
	checkout := repositories.CheckoutRepository{DB: d}
	o, e := checkout.Create(context.Background(), 1, models.CheckoutRequest{Address: coveredCheckoutAddress(), RequestKey: "review-confirmed-order", PaymentMethod: "pix", ExpectedTotalCents: 1000})
	if e != nil {
		t.Fatal(e)
	}
	exec("INSERT INTO checkout_orders(user_id,request_key,address,payment_method,total_cents,stock_debited,status) VALUES(2,'foreign','{}','pix',1000,true,'simulated_approved'),(1,'unconfirmed','{}','pix',1000,false,'simulated_approved'),(1,'cancelled','{}','pix',1000,false,'cancelled'),(1,'concurrent','{}','pix',1000,true,'simulated_approved')")
	mux := http.NewServeMux()
	InitRoutesHome(mux, handlers.HomeHandler{Store: repositories.HomeRepository{DB: d}})
	InitRoutesReviews(mux, handlers.HomeHandler{Store: repositories.HomeRepository{DB: d}})
	t.Setenv("JWT_SECRET", "purchase-review-tests-only")
	token := func(id int, role string) string {
		v, e := jwt.NewWithClaims(jwt.SigningMethodHS256, models.Claims{UserID: id, Role: role, RegisteredClaims: jwt.RegisteredClaims{Issuer: "box-enxovais-api", ExpiresAt: jwt.NewNumericDate(time.Now().Add(time.Hour))}}).SignedString([]byte("purchase-review-tests-only"))
		if e != nil {
			t.Fatal(e)
		}
		return v
	}
	customer, admin := token(1, "customer"), token(2, "admin")
	call := func(method, path, body, auth string) *httptest.ResponseRecorder {
		req := httptest.NewRequest(method, path, strings.NewReader(body))
		if auth != "" {
			req.Header.Set("Authorization", "Bearer "+auth)
		}
		w := httptest.NewRecorder()
		mux.ServeHTTP(w, req)
		return w
	}
	check := func(method, path, body, auth string, status int) *httptest.ResponseRecorder {
		t.Helper()
		w := call(method, path, body, auth)
		if w.Code != status {
			t.Fatalf("%s %s: got %d want %d: %s", method, path, w.Code, status, w.Body.String())
		}
		return w
	}
	path := "/orders/2/review"
	if o.ID != 2 {
		t.Fatal("unexpected fixture")
	}
	check("POST", path, `{"overall":5}`, "", 401)
	for _, id := range []string{"3", "4", "5", "999999"} {
		check("GET", "/orders/"+id+"/review", "", customer, 404)
		check("POST", "/orders/"+id+"/review", `{"overall":5}`, customer, 404)
	}
	check("GET", path, "", customer, 200)
	for _, body := range []string{`{}`, `{"overall":0}`, `{"overall":6}`, `{"overall":1.5}`, `{"overall":4,"navigation":0}`, `{"overall":4,"service":6}`, `{"overall":4,"comment":"\u0000"}`, `{"overall":4,"comment":"` + strings.Repeat("a", 1001) + `"}`, `{"overall":4,"unexpected":1}`} {
		check("POST", path, body, customer, 400)
	}
	check("POST", path, `{"overall":5,"comment":"  Excelente navegação  ","publicationConsent":true,"status":"approved"}`, customer, 201)
	var review models.ExperienceReview
	json.Unmarshal(check("GET", path, "", customer, 200).Body.Bytes(), &review)
	if review.Overall != 5 || review.Navigation != nil || review.Service != nil || review.Experience != nil || review.Status != "pending" || review.Comment != "Excelente navegação" {
		t.Fatal("optional criteria or moderation not preserved", review)
	}
	check("POST", path, `{"overall":4}`, customer, 409)
	start := make(chan struct{})
	codes := make(chan int, 2)
	for range 2 {
		go func() { <-start; codes <- call("POST", "/orders/6/review", `{"overall":4}`, customer).Code }()
	}
	close(start)
	x, y := <-codes, <-codes
	if !((x == 201 && y == 409) || (x == 409 && y == 201)) {
		t.Fatal("concurrent duplicate", x, y)
	}
	var count int
	if e = d.QueryRow("SELECT count(*) FROM purchase_experience_reviews WHERE order_id=6").Scan(&count); e != nil || count != 1 {
		t.Fatal("duplicate rows", e, count)
	}
	route := "/admin/experience-reviews/" + strconv.FormatInt(review.ID, 10)
	check("GET", "/admin/experience-reviews", "", customer, 403)
	check("PATCH", route, `{"status":"approved"}`, customer, 403)
	check("PATCH", route, `{"status":"approved"}`, admin, 200)
	public, e := (repositories.HomeRepository{DB: d}).Reviews(context.Background(), false)
	if e != nil || len(public) != 1 || public[0].OrderID != 0 || public[0].Navigation != nil {
		t.Fatal("moderation/consent/privacy", e)
	}
	result, changed, e := checkout.CancelOrder(context.Background(), 1, o.ID, models.CancellationReason{ReasonCode: "changed_mind"})
	if e != nil || !changed || result.Total != 1000 {
		t.Fatal("cancel", e)
	}
	check("POST", path, `{"overall":5}`, customer, 404)
	check("GET", path, "", customer, 404)
	public, e = (repositories.HomeRepository{DB: d}).Reviews(context.Background(), false)
	if e != nil || len(public) != 0 {
		t.Fatal("cancelled review is public", e)
	}
	var stock int
	if e = d.QueryRow("SELECT quantity FROM products WHERE id=1").Scan(&stock); e != nil || stock != 1 {
		t.Fatal("review must not alter stock/cancellation", e)
	}
	if _, e = d.Exec(migration("000052_purchase_review_optional_criteria", "down")); e == nil {
		t.Fatal("rollback cannot invent auxiliary ratings")
	}
}
