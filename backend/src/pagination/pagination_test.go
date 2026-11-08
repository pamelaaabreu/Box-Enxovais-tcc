package pagination

import (
	"net/url"
	"strings"
	"testing"
)

func TestParsePage(t *testing.T) {
	fields := map[string]FilterField{
		"name":       {Column: "page.name", Kind: "text"},
		"stock":      {Column: "page.quantity", Kind: "integer"},
		"price":      {Column: "page.price", Kind: "decimal"},
		"created_at": {Column: "page.created_at", Kind: "timestamp"},
	}
	q, err := ParsePage(url.Values{}, fields, 1)
	if err != nil || q.Offset != 0 || q.Limit != 20 {
		t.Fatal(q, err)
	}
	q, err = ParsePage(url.Values{"offset": {"5"}, "limit": {"2"}, "stock__gte": {"1"}, "name__contains": {"50%_test' OR 1=1--"}}, fields, 2)
	if err != nil || q.Offset != 5 || q.Limit != 2 || len(q.Args) != 2 {
		t.Fatal(q, err)
	}
	if q.Where != " WHERE page.name ILIKE $2 AND page.quantity >= $3" || strings.Contains(q.Where, "OR 1=1") {
		t.Fatal(q)
	}
	if q.Args[0] != "%50\\%\\_test' OR 1=1--%" {
		t.Fatal(q.Args)
	}
	for _, raw := range []string{
		"offset=-1", "offset=2147483648", "limit=0", "limit=101", "limit=abc",
		"limit=2&limit=3", "name=", "password=test", "name__gt=a", "name__contains__eq=a",
		"stock__contains=1", "stock=1.5", "price=NaN", "price=1e5", "created_at=yesterday",
		"name__eq%20OR%201=abc", "stock__ne=0",
	} {
		values, _ := url.ParseQuery(raw)
		if _, err := ParsePage(values, fields, 1); err == nil {
			t.Errorf("accepted %s", raw)
		}
	}
	for _, raw := range []string{"price__gte=10.99&price__lte=50", "created_at__gte=2026-01-01T00:00:00Z"} {
		values, _ := url.ParseQuery(raw)
		if _, err := ParsePage(values, fields, 1); err != nil {
			t.Error(err)
		}
	}
}
