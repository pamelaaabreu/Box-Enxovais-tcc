package routes

import (
	"backend/src/response"
	"database/sql"
	"encoding/json"
	"errors"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"

	"github.com/lib/pq"
)

var shippingCEP = regexp.MustCompile(`^[0-9]{5}-?[0-9]{3}$`)

func parseShippingCEP(value string) (int, bool) {
	value = strings.TrimSpace(value)
	if !shippingCEP.MatchString(value) {
		return 0, false
	}
	n, _ := strconv.Atoi(strings.ReplaceAll(value, "-", ""))
	return n, true
}

type shippingRange struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	StartCEP   string `json:"startCep"`
	EndCEP     string `json:"endCep"`
	PriceCents *int   `json:"priceCents"`
	MinDays    *int   `json:"minDays"`
	MaxDays    *int   `json:"maxDays"`
	Active     *bool  `json:"active"`
}

func InitRoutesShipping(mux *http.ServeMux, database *sql.DB) {
	quote := func(w http.ResponseWriter, r *http.Request) {
		cep, valid := parseShippingCEP(r.URL.Query().Get("cep"))
		if !valid {
			response.Error(w, 400, "Informe um CEP válido.")
			return
		}
		var value, min, max int
		err := database.QueryRowContext(r.Context(), `SELECT price_cents,min_days,max_days FROM shipping_ranges
   WHERE active AND int4range(start_cep,end_cep,'[]') @> $1::integer`, cep).Scan(&value, &min, &max)
		if errors.Is(err, sql.ErrNoRows) {
			response.Error(w, 404, "Entrega indisponível para este CEP no momento.")
			return
		}
		if err != nil {
			response.Error(w, 500, "Não foi possível consultar a entrega.")
			return
		}
		response.JSON(w, 200, map[string]int{"priceCents": value, "minDays": min, "maxDays": max})
	}
	publicRoute(mux, http.MethodGet, "GET /shipping/quote", quote)
	const base = "/admin/catalog/shipping-ranges"
	adminRoute(mux, http.MethodGet, "GET "+base, func(w http.ResponseWriter, r *http.Request) {
		rows, err := database.QueryContext(r.Context(), `SELECT id,name,lpad(start_cep::text,8,'0'),lpad(end_cep::text,8,'0'),price_cents,min_days,max_days,active FROM shipping_ranges ORDER BY start_cep,id`)
		if err != nil {
			response.Error(w, 500, "Não foi possível listar as faixas.")
			return
		}
		defer rows.Close()
		items := []shippingRange{}
		for rows.Next() {
			var item shippingRange
			if err = rows.Scan(&item.ID, &item.Name, &item.StartCEP, &item.EndCEP, &item.PriceCents, &item.MinDays, &item.MaxDays, &item.Active); err != nil {
				response.Error(w, 500, "Não foi possível listar as faixas.")
				return
			}
			items = append(items, item)
		}
		if rows.Err() != nil {
			response.Error(w, 500, "Não foi possível listar as faixas.")
			return
		}
		response.JSON(w, 200, items)
	})
	save := func(w http.ResponseWriter, r *http.Request) {
		var item shippingRange
		decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 4096))
		decoder.DisallowUnknownFields()
		if err := decoder.Decode(&item); err != nil {
			response.Error(w, 400, "Dados da faixa inválidos.")
			return
		}
		start, startOK := parseShippingCEP(item.StartCEP)
		end, endOK := parseShippingCEP(item.EndCEP)
		item.Name = strings.TrimSpace(item.Name)
		if !startOK || !endOK || start > end || item.Name == "" || utf8.RuneCountInString(item.Name) > 100 ||
			item.PriceCents == nil || *item.PriceCents < 0 || *item.PriceCents > 2147483647 ||
			item.MinDays == nil || item.MaxDays == nil || *item.MinDays < 0 || *item.MinDays > *item.MaxDays || *item.MaxDays > 2147483647 || item.Active == nil {
			response.Error(w, 400, "Confira o nome, os limites de CEP, o valor e os prazos.")
			return
		}
		args := []any{item.Name, start, end, *item.PriceCents, *item.MinDays, *item.MaxDays, *item.Active}
		query := `INSERT INTO shipping_ranges(name,start_cep,end_cep,price_cents,min_days,max_days,active) VALUES($1,$2,$3,$4,$5,$6,$7) RETURNING id`
		status := http.StatusCreated
		if r.Method == http.MethodPatch {
			id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
			if err != nil || id <= 0 {
				response.Error(w, 400, "Faixa inválida.")
				return
			}
			query = `UPDATE shipping_ranges SET name=$1,start_cep=$2,end_cep=$3,price_cents=$4,min_days=$5,max_days=$6,active=$7 WHERE id=$8 RETURNING id`
			args = append(args, id)
			status = http.StatusOK
		}
		err := database.QueryRowContext(r.Context(), query, args...).Scan(&item.ID)
		var pg *pq.Error
		switch {
		case errors.Is(err, sql.ErrNoRows):
			response.Error(w, 404, "Faixa não encontrada.")
		case errors.As(err, &pg) && pg.Code == "23P01":
			response.Error(w, 409, "Já existe uma faixa ativa que cobre parte deste intervalo.")
		case err != nil:
			response.Error(w, 500, "Não foi possível salvar a faixa.")
		default:
			response.JSON(w, status, item)
		}
	}
	adminRoute(mux, http.MethodPost, "POST "+base, save)
	adminRoute(mux, http.MethodPatch, "PATCH "+base+"/{id}", save)
	adminRoute(mux, http.MethodDelete, "DELETE "+base+"/{id}", func(w http.ResponseWriter, r *http.Request) {
		id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
		if err != nil || id <= 0 {
			response.Error(w, 400, "Faixa inválida.")
			return
		}
		result, err := database.ExecContext(r.Context(), "DELETE FROM shipping_ranges WHERE id=$1", id)
		if err != nil {
			response.Error(w, 500, "Não foi possível excluir a faixa.")
			return
		}
		count, err := result.RowsAffected()
		if err != nil {
			response.Error(w, 500, "Não foi possível excluir a faixa.")
			return
		}
		if count == 0 {
			response.Error(w, 404, "Faixa não encontrada.")
			return
		}
		w.WriteHeader(http.StatusNoContent)
	})
}
