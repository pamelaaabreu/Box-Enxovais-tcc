package pagination

import (
	"context"
	"database/sql"
	"fmt"
	"math"
	"net/url"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"time"
)

// Limites padrão e máximo da paginação.
const DefaultLimit = 20
const MaxLimit = 100

// Limite da lista de identificadores, independente do tamanho da página.
const MaxFilterIDs = 100
const maxSQLParameters = 65535
const (
	FilterText        = "text"
	FilterInteger     = "integer"
	FilterDecimal     = "decimal"
	FilterTimestamp   = "timestamp"
	FilterIntegerList = "integer_list"
)
const (
	operatorEqual    = "eq"
	operatorContains = "contains"
)

var filterOperators = map[string]string{"eq": "=", "gte": ">=", "lte": "<=", "gt": ">", "lt": "<", "contains": "ILIKE"}

// Define uma coluna permitida e seu tipo de filtro.
type FilterField struct {
	Column string
	Kind   string // text, integer, decimal or timestamp
}

// Metadados retornados ao frontend.
type Pagination struct {
	Offset  int   `json:"offset"`
	Limit   int   `json:"limit"`
	Total   int64 `json:"total"`
	HasMore bool  `json:"hasMore"`
}

// Estrutura genérica de uma página.
type Page[T any] struct {
	Items      []T        `json:"items"`
	Pagination Pagination `json:"pagination"`
}

// Informações necessárias para construir a consulta.
type PageQuery struct {
	firstParameter int // Base posicional de filtros gerados por ParsePage.

	Order  string // Ordenação definida pelo servidor.
	Offset int
	Limit  int
	Where  string
	Args   []any
}

// Aceita números decimais com até 12 dígitos inteiros
// e até duas casas decimais.
var decimalValue = regexp.MustCompile(`^-?[0-9]{1,12}(\.[0-9]{1,2})?$`)

// Processa os filtros permitidos e os parâmetros de paginação.
// As colunas são definidas pelo servidor.
// Os valores recebidos são utilizados como parâmetros SQL.
func ParsePage(values url.Values, fields map[string]FilterField, firstParameter int) (PageQuery, error) {

	q := PageQuery{Limit: DefaultLimit, firstParameter: firstParameter}
	if firstParameter < 1 || firstParameter > maxSQLParameters-1 {
		return q, fmt.Errorf("Posição inicial de parâmetros inválida")
	}

	// Recupera e ordena as chaves para garantir
	// uma construção determinística dos filtros.
	keys := make([]string, 0, len(values))

	for key := range values {
		keys = append(keys, key)
	}

	sort.Strings(keys)

	clauses := []string{}

	for _, key := range keys {

		entries := values[key]

		// Rejeita parâmetros repetidos, vazios ou muito extensos.
		if len(entries) != 1 ||
			entries[0] == "" ||
			len(entries[0]) > 500 {

			return q, fmt.Errorf("Parâmetro inválido: %s", key)
		}

		value := entries[0]

		// Processa os parâmetros de paginação.
		if key == "offset" || key == "limit" {

			n, err := strconv.ParseInt(value, 10, 32)

			if err != nil ||
				n < 0 ||
				(key == "limit" && (n < 1 || n > MaxLimit)) {

				return q, fmt.Errorf(
					"%s inválido (offset >= 0; limit entre 1 e %d)",
					key,
					MaxLimit,
				)
			}

			if key == "offset" {
				q.Offset = int(n)
			} else {
				q.Limit = int(n)
			}

			continue
		}

		// Separa o campo do operador.
		// Exemplo: price__gte.
		parts := strings.Split(key, "__")

		field, ok := fields[parts[0]]

		// Aceita somente campos cadastrados na whitelist.
		if !ok || len(parts) > 2 {
			return q, fmt.Errorf("Filtro não permitido: %s", key)
		}

		// Utiliza igualdade como operador padrão.
		op := operatorEqual

		if len(parts) == 2 {
			op = parts[1]
		}

		// Traduz os operadores permitidos para SQL.
		operator, ok := filterOperators[op]

		// Verifica a compatibilidade entre operador e tipo.
		if !ok ||
			(op == operatorContains && field.Kind != FilterText) ||
			(field.Kind == FilterText && op != operatorEqual && op != operatorContains) {

			return q, fmt.Errorf("Operador não permitido: %s", key)
		}

		// Processa filtros que recebem listas de IDs.
		if field.Kind == FilterIntegerList {

			if op != operatorEqual {
				return q, fmt.Errorf("Operador não permitido: %s", key)
			}

			ids := strings.Split(value, ",")

			if len(ids) > MaxFilterIDs {
				return q, fmt.Errorf("Lista de valores inválida: %s", key)
			}

			params := make([]string, 0, len(ids))

			for _, id := range ids {

				n, err := strconv.ParseInt(id, 10, 32)

				if err != nil || n <= 0 {
					return q, fmt.Errorf("Valor inteiro inválido: %s", key)
				}

				// Gera os parâmetros posicionais do PostgreSQL.
				params = append(
					params,
					fmt.Sprintf("$%d", firstParameter+len(q.Args)),
				)

				q.Args = append(q.Args, n)
			}

			// Constrói uma condição IN parametrizada.
			clauses = append(
				clauses,
				field.Column+" IN ("+strings.Join(params, ",")+")",
			)

			continue
		}

		var arg any = value

		// Valida e converte o valor conforme seu tipo.
		switch field.Kind {

		case FilterInteger:

			n, err := strconv.ParseInt(value, 10, 64)

			if err != nil {
				return q, fmt.Errorf("Valor inteiro inválido: %s", key)
			}

			arg = n

		case FilterDecimal:

			if !decimalValue.MatchString(value) {
				return q, fmt.Errorf("Valor decimal inválido: %s", key)
			}

		case FilterTimestamp:

			parsed, err := time.Parse(time.RFC3339, value)

			if err != nil {
				return q, fmt.Errorf(
					"Data inválida em %s: use RFC3339",
					key,
				)
			}

			arg = parsed

		case FilterText:
			if strings.ContainsRune(value, 0) {
				return q, fmt.Errorf("Texto inválido em %s", key)
			}

			if op == operatorContains {

				// Protege caracteres especiais do ILIKE.
				arg = "%" + strings.NewReplacer(
					`\`, `\\`,
					"%", `\%`,
					"_", `\_`,
				).Replace(value) + "%"
			}

		default:

			return q, fmt.Errorf("Tipo de filtro não configurado: %s", key)
		}

		// Armazena o valor separadamente da instrução SQL.
		q.Args = append(q.Args, arg)

		// Constrói a condição parametrizada.
		clauses = append(
			clauses,
			fmt.Sprintf(
				"%s %s $%d",
				field.Column,
				operator,
				firstParameter+len(q.Args)-1,
			),
		)
	}

	if firstParameter+len(q.Args)-1 > maxSQLParameters-2 {
		return q, fmt.Errorf("Quantidade de parâmetros excedida")
	}

	// Combina todos os filtros utilizando AND.
	if len(clauses) > 0 {
		q.Where = " WHERE " + strings.Join(clauses, " AND ")
	}

	return q, nil
}

// Executa a contagem e a consulta paginada utilizando
// a mesma visão dos dados.
//
// baseSQL e orderBy devem ser definidos pelo servidor.
func ReadPage[T any](
	ctx context.Context,
	database *sql.DB,
	baseSQL string,
	baseArgs []any,
	query PageQuery,
	orderBy string,
	scan func(*sql.Rows) (T, error),
) (Page[T], error) {

	// Inicializa o resultado com um slice vazio.
	result := Page[T]{
		Items: []T{},
		Pagination: Pagination{
			Offset: query.Offset,
			Limit:  query.Limit,
		},
	}

	if query.Limit < 1 || query.Limit > MaxLimit || query.Offset < 0 || int64(query.Offset) > math.MaxInt32 {
		return result, fmt.Errorf("Limite ou offset de paginação inválido")
	}
	if query.firstParameter != 0 && query.firstParameter != len(baseArgs)+1 {
		return result, fmt.Errorf("Parâmetros anteriores incompatíveis com os filtros")
	}
	if len(baseArgs)+len(query.Args) > maxSQLParameters-2 {
		return result, fmt.Errorf("Quantidade de parâmetros excedida")
	}
	if database == nil || scan == nil || strings.TrimSpace(baseSQL) == "" || strings.TrimSpace(orderBy) == "" {
		return result, fmt.Errorf("Consulta paginada não configurada")
	}

	// Utiliza uma transação somente para leitura,
	// garantindo consistência entre contagem e listagem.
	tx, err := database.BeginTx(ctx, &sql.TxOptions{
		Isolation: sql.LevelRepeatableRead,
		ReadOnly:  true,
	})

	if err != nil {
		return result, err
	}

	defer tx.Rollback()

	// Monta a origem compartilhada pelas consultas.
	source := " FROM (" + baseSQL + ") AS page" + query.Where

	// Combina os argumentos da consulta original
	// com os argumentos dos filtros.
	args := append(append([]any{}, baseArgs...), query.Args...)

	// Recupera a quantidade total de registros filtrados.
	if err = tx.QueryRowContext(
		ctx,
		"SELECT COUNT(*)"+source,
		args...,
	).Scan(&result.Pagination.Total); err != nil {

		return result, err
	}

	// Monta a consulta paginada.
	sqlQuery := fmt.Sprintf(`SELECT page.*%s
ORDER BY %s
LIMIT $%d
OFFSET $%d`,
		source,
		orderBy,
		len(args)+1,
		len(args)+2,
	)

	// Acrescenta os parâmetros de limite e offset.
	rows, err := tx.QueryContext(
		ctx,
		sqlQuery,
		append(args, query.Limit, query.Offset)...,
	)

	if err != nil {
		return result, err
	}

	defer rows.Close()

	// Utiliza o scanner fornecido pelo repository.
	for rows.Next() {

		item, err := scan(rows)

		if err != nil {
			return result, err
		}

		result.Items = append(result.Items, item)
	}

	// Verifica erros ocorridos durante a leitura.
	if err = rows.Err(); err != nil {
		return result, err
	}

	if err = rows.Close(); err != nil {
		return result, err
	}

	// Identifica se ainda existem registros após esta página.
	result.Pagination.HasMore =
		int64(query.Offset)+int64(len(result.Items)) <
			result.Pagination.Total

	return result, tx.Commit()
}
