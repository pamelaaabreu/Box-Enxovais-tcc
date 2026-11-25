package handlers

import (
	"backend/src/models"
	"bytes"
	"errors"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestRequestJSONSecurity(t *testing.T) {
	for _, tc := range []struct {
		name, body string
		want       int
	}{
		{"malformed", `{"name":`, 400}, {"unknown", `{"extra":1}`, 400}, {"trailing", `{"name":"x"} {}`, 400}, {"trailing invalid", `{"name":"x"} garbage`, 400}, {"null", `null`, 400}, {"array", `[]`, 400}, {"oversized", `{"name":"` + strings.Repeat("x", 80) + `"}`, 413}, {"oversized whitespace", `{"name":"x"}` + strings.Repeat(" ", 80), 413}, {"valid", `{"name":"x"}`, 200},
	} {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			r := httptest.NewRequest("POST", "/", strings.NewReader(tc.body))
			var body struct {
				Name string `json:"name"`
			}
			ok := decodeBody(w, r, &body, 64, "Inválido")
			if ok != (tc.want == 200) || w.Code != tc.want {
				t.Fatalf("HTTP=%d valid=%v", w.Code, ok)
			}
		})
	}
}
func TestUnexpectedMethodsHaveNoSideEffects(t *testing.T) {
	tests := []struct {
		name    string
		handler http.HandlerFunc
	}{
		{"cart", (CartHandler{}).ServeHTTP}, {"favorites", (FavoritesHandler{}).ServeHTTP}, {"account", (AccountHandler{}).ServeHTTP}, {"checkout", (CheckoutHandler{}).ServeHTTP}, {"orders", (OrderHistoryHandler{}).ServeHTTP}, {"admin orders", (AdminOrdersHandler{}).ServeHTTP}, {"product", (ProductHandler{}).AdminProduct}, {"create", (ProductHandler{}).CreateProduct}, {"gallery", (ProductImageHandler{}).AdminImages}, {"review", (ProductReviewHandler{}).Save}, {"experience", (HomeHandler{}).Review}, {"shipping", SaveShippingRange(nil)}, {"quote", QuoteShipping(nil)}, {"report", (ProductHandler{}).Report("sales", true)},
	}
	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			tc.handler(w, httptest.NewRequest("OPTIONS", "/", nil))
			if w.Code != 405 || w.Header().Get("Allow") == "" {
				t.Fatalf("status=%d Allow=%s", w.Code, w.Header().Get("Allow"))
			}
		})
	}
}
func TestReviewMissingIdentity(t *testing.T) {
	for _, tc := range []struct {
		name, method string
		handler      http.HandlerFunc
	}{
		{"mine", "GET", (ProductReviewHandler{}).Mine}, {"eligible", "GET", (ProductReviewHandler{}).Reviewable}, {"save", "POST", (ProductReviewHandler{}).Save}, {"moderate", "PATCH", (ProductReviewHandler{}).Moderate}, {"experience moderation", "PATCH", (HomeHandler{}).Moderate},
	} {
		t.Run(tc.name, func(t *testing.T) {
			w := httptest.NewRecorder()
			r := httptest.NewRequest(tc.method, "/", nil)
			r.SetPathValue("id", "1")
			tc.handler(w, r)
			if w.Code != 401 {
				t.Fatalf("identity status=%d", w.Code)
			}
		})
	}
}
func TestCPFStandaloneSafety(t *testing.T) {
	for _, value := range []string{"", "1", "1234567890", "123456789012", "abcdefghijk", "11111111111", "52998224724"} {
		if validCPF(value) {
			t.Errorf("accepted invalid CPF %q", value)
		}
	}
	if !validCPF("52998224725") {
		t.Fatal("valid CPF rejected")
	}
}

type brokenCSVWriter struct{ short bool }

func (w brokenCSVWriter) Write(p []byte) (int, error) {
	if w.short {
		return len(p) - 1, nil
	}
	return 0, io.ErrClosedPipe
}
func TestCSVPreparationAndWriteFailures(t *testing.T) {
	if _, err := buildReportCSV("sales", []models.ReportRow{{CreatedAt: "invalid"}}); err == nil {
		t.Fatal("bad timestamp silently exported")
	}
	content, err := buildReportCSV("products", []models.ReportRow{{Name: " \t=SUM(1,1)", RevenueCents: 1001}})
	if err != nil {
		t.Fatal(err)
	}
	if !bytes.HasPrefix(content, []byte{0xef, 0xbb, 0xbf}) || !bytes.Contains(content, []byte("' \t=SUM(1,1)")) {
		t.Fatal("BOM/injection protection lost")
	}
	if !errors.Is(writeReportCSV(brokenCSVWriter{}, content), io.ErrClosedPipe) {
		t.Fatal("write error ignored")
	}
	if !errors.Is(writeReportCSV(brokenCSVWriter{short: true}, content), io.ErrShortWrite) {
		t.Fatal("short write ignored")
	}
}
func TestDashboardCivilDayBoundaries(t *testing.T) {
	loc, err := time.LoadLocation("America/Sao_Paulo")
	if err != nil {
		t.Fatal(err)
	}
	start, err := dashboardDate("2018-08-06", loc)
	if err != nil {
		t.Fatal(err)
	}
	until, err := dashboardDate("2018-11-07", loc)
	if err != nil {
		t.Fatal(err)
	}
	if days := civilDays(start, until); days != 93 {
		t.Fatalf("civil days=%d", days)
	}
	if _, err := dashboardDate("2026-01-01", nil); err == nil {
		t.Fatal("nil timezone accepted")
	}
	if _, err := reportFilter(httptest.NewRequest("GET", "/?search=%00", nil), "stock"); err == nil {
		t.Fatal("NUL search accepted")
	}
	if _, err := reportFilter(httptest.NewRequest("GET", "/?search="+strings.Repeat("%C3%A1", 160), nil), "stock"); err != nil {
		t.Fatal("character limit treated as byte limit", err)
	}
}
