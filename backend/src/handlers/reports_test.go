package handlers

import (
	"net/http/httptest"
	"strings"
	"testing"
)

func TestReportFilters(t *testing.T) {
	for _, query := range []string{"page=0", "pageSize=101", "page=x", "status=active", "sort=price", "period=custom&dateFrom=2026-02-01&dateTo=2026-01-01", "search=" + strings.Repeat("a", 161)} {
		if _, e := reportFilter(httptest.NewRequest("GET", "/?"+query, nil), "sales"); e == nil {
			t.Error("accepted invalid filter", query)
		}
	}
	for _, kind := range []string{"sales", "products", "customers", "stock"} {
		f, e := reportFilter(httptest.NewRequest("GET", "/?page=2&pageSize=10", nil), kind)
		if e != nil || f.Page != 2 || f.PageSize != 10 {
			t.Error("valid filter rejected", kind, e)
		}
	}
	if _, e := reportFilter(httptest.NewRequest("GET", "/?period=invalid", nil), "stock"); e != nil {
		t.Error("current stock must ignore dates", e)
	}
}
func TestReportCSVProtection(t *testing.T) {
	for _, v := range []string{"=SUM(1,1)", "+123", "-cmd", "@SUM(A1)", " \t=1", "\ufeff=1", "\r\n=1"} {
		if !strings.HasPrefix(reportCSVText(v), "'") {
			t.Errorf("unsafe CSV cell %q", v)
		}
	}
	for _, v := range []string{"Algodão", "BX-CAM-001", "123,45"} {
		if reportCSVText(v) != v {
			t.Error("safe text changed")
		}
	}
	if reportMoney(1001) != "10,01" {
		t.Error("inexact money")
	}
}
