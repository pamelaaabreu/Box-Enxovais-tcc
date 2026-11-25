package pagination

import (
	"context"
	"database/sql"
	"math"
	"net/url"
	"strconv"
	"strings"
	"testing"
)

func TestFirstParameterAndTextSafety(t *testing.T) {
	fields := map[string]FilterField{"name": {Column: "page.name", Kind: FilterText}}
	for _, first := range []int{-1, 0, maxSQLParameters} {
		if _, err := ParsePage(url.Values{}, fields, first); err == nil {
			t.Fatalf("first=%d accepted", first)
		}
	}
	for _, op := range []string{"name", "name__contains"} {
		if _, err := ParsePage(url.Values{op: {"unsafe\x00value"}}, fields, 1); err == nil {
			t.Fatal("NUL accepted")
		}
	}
	query, err := ParsePage(url.Values{"name": {"safe"}}, fields, 2)
	if err != nil {
		t.Fatal(err)
	}
	_, err = ReadPage[int](context.Background(), nil, "SELECT 1", nil, query, "page.id", func(*sql.Rows) (int, error) { return 0, nil })
	if err == nil || !strings.Contains(err.Error(), "anteriores") {
		t.Fatal("base arguments mismatch not detected", err)
	}
}
func TestDirectReadPageValidation(t *testing.T) {
	for _, q := range []PageQuery{{Limit: 0}, {Limit: -1}, {Limit: MaxLimit + 1}, {Limit: 1, Offset: -1}, {Limit: 1, Offset: math.MaxInt32 + 1}} {
		if _, err := ReadPage[int](context.Background(), nil, "SELECT 1", nil, q, "page.id", nil); err == nil || !strings.Contains(err.Error(), "Limite ou offset") {
			t.Fatal("invalid direct pagination accepted")
		}
	}
}
func TestIdentifierLimitIndependentOfPageSize(t *testing.T) {
	fields := map[string]FilterField{"ids": {Column: "page.id", Kind: FilterIntegerList}}
	values := make([]string, MaxFilterIDs)
	for i := range values {
		values[i] = strconv.Itoa(i + 1)
	}
	q, err := ParsePage(url.Values{"limit": {"1"}, "ids": {strings.Join(values, ",")}}, fields, 1)
	if err != nil || q.Limit != 1 || len(q.Args) != MaxFilterIDs {
		t.Fatal(q, err)
	}
	values = append(values, "101")
	if _, err := ParsePage(url.Values{"ids": {strings.Join(values, ",")}}, fields, 1); err == nil {
		t.Fatal("identifier maximum ignored")
	}
}
