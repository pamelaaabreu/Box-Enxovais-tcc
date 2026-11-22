package handlers

import (
	"net/http/httptest"
	"testing"
	"time"
)

func TestDashboardPeriod(t *testing.T) {
	now := time.Date(2026, 11, 22, 1, 0, 0, 0, time.UTC)
	for _, test := range []struct{ query, from, until, group string }{
		{"", "2026-10-23", "2026-11-22", "day"}, {"period=today", "2026-11-21", "2026-11-22", "day"}, {"period=7d", "2026-11-15", "2026-11-22", "day"}, {"period=month", "2026-11-01", "2026-11-22", "day"}, {"period=last_month", "2026-10-01", "2026-11-01", "day"}, {"period=custom&dateFrom=2026-01-01&dateTo=2026-06-30", "2026-01-01", "2026-07-01", "month"}, {"period=30d&group=month", "2026-10-23", "2026-11-22", "month"},
	} {
		t.Run(test.query, func(t *testing.T) {
			p, e := dashboardPeriod(httptest.NewRequest("GET", "/admin/dashboard?"+test.query, nil), now)
			if e != nil || p.From.Format(time.DateOnly) != test.from || p.Until.Format(time.DateOnly) != test.until || p.Group != test.group || p.From.Hour() != 0 || p.Timezone != "America/Sao_Paulo" {
				t.Fatalf("incorrect period: %+v %v", p, e)
			}
		})
	}
	for _, query := range []string{"period=unknown", "group=week", "period=custom", "period=custom&dateFrom=invalid&dateTo=2026-01-01", "period=custom&dateFrom=2026-02-01&dateTo=2026-01-01", "period=custom&dateFrom=2020-01-01&dateTo=2026-01-01", "period=custom&dateFrom=2024-01-01&dateTo=2026-01-01&group=day"} {
		if _, e := dashboardPeriod(httptest.NewRequest("GET", "/admin/dashboard?"+query, nil), now); e == nil {
			t.Fatal("invalid period accepted", query)
		}
	}
}

func TestDashboardHistoricalTimezone(t *testing.T) {
	p, e := dashboardPeriod(httptest.NewRequest("GET", "/admin/dashboard?period=custom&dateFrom=2018-11-04&dateTo=2018-11-04", nil), time.Now())
	if e != nil || p.From.Format(time.DateOnly) != "2018-11-04" || p.From.Hour() != 1 || p.Until.Format(time.DateOnly) != "2018-11-05" || p.Until.Hour() != 0 {
		t.Fatalf("local DST boundary mismatch: %+v %v", p, e)
	}
}
