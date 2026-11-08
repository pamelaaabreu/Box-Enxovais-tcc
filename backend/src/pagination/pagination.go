package pagination

import (
	"context"
	"database/sql"
	"fmt"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

const DefaultLimit = 20
const MaxLimit = 100

type FilterField struct {
	Column string
	Kind   string // text, integer, decimal or timestamp
}

type Pagination struct {
	Offset  int   `json:"offset"`
	Limit   int   `json:"limit"`
	Total   int64 `json:"total"`
	HasMore bool  `json:"hasMore"`
}

type Page[T any] struct {
	Items      []T        `json:"items"`
	Pagination Pagination `json:"pagination"`
}

type PageQuery struct {
	Offset int
	Limit  int
	Where  string
	Args   []any
}

var decimalValue = regexp.MustCompile(`^-?[0-9]{1,12}(\.[0-9]{1,2})?$`)

// Only server-owned column mappings are used in SQL. User values are parameters.
func ParsePage(values url.Values, fields map[string]FilterField, firstParameter int) (PageQuery, error) {
	q := PageQuery{Limit: DefaultLimit}
	keys := make([]string, 0, len(values))
	for key := range values {
		keys = append(keys, key)
	}
	sort.Strings(keys)
	clauses := []string{}
	for _, key := range keys {
		entries := values[key]
		if len(entries) != 1 || entries[0] == "" || len(entries[0]) > 500 {
			return q, fmt.Errorf("Parâmetro inválido: %s", key)
		}
		value := entries[0]
		if key == "offset" || key == "limit" {
			n, err := strconv.ParseInt(value, 10, 32)
			if err != nil || n < 0 || (key == "limit" && (n < 1 || n > MaxLimit)) {
				return q, fmt.Errorf("%s inválido (offset >= 0; limit entre 1 e %d)", key, MaxLimit)
			}
			if key == "offset" {
				q.Offset = int(n)
			} else {
				q.Limit = int(n)
			}
			continue
		}
		parts := strings.Split(key, "__")
		field, ok := fields[parts[0]]
		if !ok || len(parts) > 2 {
			return q, fmt.Errorf("Filtro não permitido: %s", key)
		}
		op := "eq"
		if len(parts) == 2 {
			op = parts[1]
		}
		operator, ok := map[string]string{"eq": "=", "gte": ">=", "lte": "<=", "gt": ">", "lt": "<", "contains": "ILIKE"}[op]
		if !ok || (op == "contains" && field.Kind != "text") || (field.Kind == "text" && op != "eq" && op != "contains") {
			return q, fmt.Errorf("Operador não permitido: %s", key)
		}
		var arg any = value
		switch field.Kind {
		case "integer":
			n, err := strconv.ParseInt(value, 10, 64)
			if err != nil {
				return q, fmt.Errorf("Valor inteiro inválido: %s", key)
			}
			arg = n
		case "decimal":
			if !decimalValue.MatchString(value) {
				return q, fmt.Errorf("Valor decimal inválido: %s", key)
			}
		case "timestamp":
			parsed, err := time.Parse(time.RFC3339, value)
			if err != nil {
				return q, fmt.Errorf("Data inválida em %s: use RFC3339", key)
			}
			arg = parsed
		case "text":
			if op == "contains" {
				arg = "%" + strings.NewReplacer(`\`, `\\`, "%", `\%`, "_", `\_`).Replace(value) + "%"
			}
		default:
			return q, fmt.Errorf("Tipo de filtro não configurado: %s", key)
		}
		q.Args = append(q.Args, arg)
		clauses = append(clauses, fmt.Sprintf("%s %s $%d", field.Column, operator, firstParameter+len(q.Args)-1))
	}
	if len(clauses) > 0 {
		q.Where = " WHERE " + strings.Join(clauses, " AND ")
	}
	return q, nil
}

// Count and items use the same snapshot, including for empty/out-of-range pages.
// baseSQL and orderBy must be constants owned by the caller, never URL values.
func ReadPage[T any](ctx context.Context, database *sql.DB, baseSQL string, baseArgs []any, query PageQuery, orderBy string, scan func(*sql.Rows) (T, error)) (Page[T], error) {
	result := Page[T]{Items: []T{}, Pagination: Pagination{Offset: query.Offset, Limit: query.Limit}}
	tx, err := database.BeginTx(ctx, &sql.TxOptions{Isolation: sql.LevelRepeatableRead, ReadOnly: true})
	if err != nil {
		return result, err
	}
	defer tx.Rollback()
	source := " FROM (" + baseSQL + ") AS page" + query.Where
	args := append(append([]any{}, baseArgs...), query.Args...)
	if err = tx.QueryRowContext(ctx, "SELECT COUNT(*)"+source, args...).Scan(&result.Pagination.Total); err != nil {
		return result, err
	}
	sqlQuery := fmt.Sprintf("SELECT page.*%s ORDER BY %s LIMIT $%d OFFSET $%d", source, orderBy, len(args)+1, len(args)+2)
	rows, err := tx.QueryContext(ctx, sqlQuery, append(args, query.Limit, query.Offset)...)
	if err != nil {
		return result, err
	}
	defer rows.Close()
	for rows.Next() {
		item, err := scan(rows)
		if err != nil {
			return result, err
		}
		result.Items = append(result.Items, item)
	}
	if err = rows.Err(); err != nil {
		return result, err
	}
	if err = rows.Close(); err != nil {
		return result, err
	}
	result.Pagination.HasMore = int64(query.Offset)+int64(len(result.Items)) < result.Pagination.Total
	return result, tx.Commit()
}
