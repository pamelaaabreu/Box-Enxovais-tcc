package handlers

import (
	"backend/src/response"
	"backend/src/services"
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"
)

type AdminCustomerHandler struct{ Service services.AdminCustomerService }

func (h AdminCustomerHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	page := 1
	if raw := r.URL.Query().Get("page"); raw != "" {
		n, e := strconv.Atoi(raw)
		if e != nil || n < 1 || n > 1000000 {
			response.Error(w, 400, "Página inválida.")
			return
		}
		page = n
	}
	var data any
	var err error
	if raw := r.PathValue("id"); raw != "" {
		id, e := strconv.Atoi(raw)
		if e != nil || id <= 0 || id > 2147483647 {
			response.Error(w, 404, "Cliente não encontrado.")
			return
		}
		if strings.HasSuffix(r.URL.Path, "/orders") {
			data, err = h.Service.Orders(r.Context(), id, page)
		} else {
			data, err = h.Service.Detail(r.Context(), id)
		}
	} else {
		search := strings.TrimSpace(r.URL.Query().Get("search"))
		if !utf8.ValidString(search) || utf8.RuneCountInString(search) > 200 || strings.ContainsRune(search, 0) {
			response.Error(w, 400, "Informe uma busca com até 200 caracteres válidos.")
			return
		}
		data, err = h.Service.List(r.Context(), search, page)
	}
	if errors.Is(err, sql.ErrNoRows) {
		response.Error(w, 404, "Cliente não encontrado.")
		return
	}
	if err != nil {
		response.Error(w, 500, "Não foi possível consultar os clientes. Tente novamente.")
		return
	}
	response.Success(w, 200, "", data)
}
