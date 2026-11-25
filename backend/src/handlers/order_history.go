package handlers

import (
	middlewares "backend/src/middleware"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/response"
	"context"
	"database/sql"
	"errors"
	"net/http"
	"net/url"
	"strconv"
	"strings"
	"time"
	_ "time/tzdata"
	"unicode/utf8"
)

type OrderHistoryHandler struct {
	NotifyCancelled func(int, models.OrderDetails)

	Store interface {
		CancelOrder(context.Context, int, int64, models.CancellationReason) (models.OrderDetails, bool, error)
		GetOrderDetails(context.Context, int, int64) (models.OrderDetails, error)
		ListOrders(context.Context, int, int, int, models.OrderFilters) ([]models.OrderHistoryEntry, error)
	}
}

func (h OrderHistoryHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet, http.MethodPost) {
		return
	}

	w.Header().Set("Cache-Control", "no-store")

	userID, ok := middlewares.GetUserIDFromContext(r.Context())

	if !ok || userID <= 0 {
		response.Error(w, http.StatusUnauthorized, "Faça login para consultar seus pedidos")
		return
	}

	// Quando existe um ID, consulta ou cancela um pedido.
	if raw := r.PathValue("id"); raw != "" {

		id, err := strconv.ParseInt(raw, 10, 64)

		if err != nil || id <= 0 {
			response.Error(w, http.StatusNotFound, "Pedido não encontrado")
			return
		}

		if r.Method == http.MethodPost {
			h.cancel(w, r, userID, id)
			return
		}

		order, err := h.Store.GetOrderDetails(r.Context(), userID, id)

		if errors.Is(err, sql.ErrNoRows) {
			response.Error(w, http.StatusNotFound, "Pedido não encontrado")
			return
		}

		if err != nil {
			response.Error(w, http.StatusInternalServerError, "Não foi possível consultar o pedido")
			return
		}

		response.Success(w, http.StatusOK, "", order)
		return
	}

	// Configura e valida a paginação.
	const pageSize = 10

	page, pageErr := requestPage(r.URL.Query().Get("page"), maximumRequestPage)
	if pageErr != nil {
		response.Error(w, http.StatusBadRequest, "Página inválida")
		return
	}

	// Interpreta os filtros recebidos.
	filters, err := parseOrderFilters(r)

	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	var orders []models.OrderHistoryEntry
	var total *int

	// Verifica se o repository possui uma operação
	// que retorna os pedidos e a contagem total.
	if pager, ok := h.Store.(interface {
		ListOrdersPage(context.Context, int, int, int, models.OrderFilters) ([]models.OrderHistoryEntry, int, error)
	}); ok {

		var count int

		orders, count, err = pager.ListOrdersPage(
			r.Context(),
			userID,
			pageSize+1,
			(page-1)*pageSize,
			filters,
		)

		total = &count

	} else {

		// Utiliza o método alternativo de listagem.
		orders, err = h.Store.ListOrders(
			r.Context(),
			userID,
			pageSize+1,
			(page-1)*pageSize,
			filters,
		)
	}

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Não foi possível consultar seus pedidos")
		return
	}

	// Verifica a existência de uma próxima página.
	hasMore := len(orders) > pageSize

	if hasMore {
		orders = orders[:pageSize]
	}

	data := map[string]any{
		"orders":  orders,
		"hasMore": hasMore,
	}

	// Inclui a contagem total quando disponível.
	if total != nil {

		data["total"] = *total

	} else if counter, ok := h.Store.(interface {
		CountOrders(context.Context, int, models.OrderFilters) (int, error)
	}); ok {

		total, e := counter.CountOrders(
			r.Context(),
			userID,
			filters,
		)

		if e != nil {
			response.Error(w, http.StatusInternalServerError, "Não foi possível contar seus pedidos.")
			return
		}

		data["total"] = total
	}

	response.Success(w, http.StatusOK, "", data)
}

func (h OrderHistoryHandler) cancel(w http.ResponseWriter, r *http.Request, userID int, id int64) {

	var reason models.CancellationReason

	// Limita o tamanho da requisição e valida o JSON.
	if !decodeBody(w, r, &reason, 8192, "Informe um motivo válido para o cancelamento.") {
		return
	}

	// Valida os motivos permitidos.
	switch reason.ReasonCode {

	case "changed_mind",
		"wrong_product",
		"wrong_address",
		"duplicate_order",
		"other":

	default:
		response.Error(w, http.StatusBadRequest, "Informe um motivo válido para o cancelamento.")
		return
	}

	reason.ReasonDetails = strings.TrimSpace(reason.ReasonDetails)

	// Exige uma observação quando o motivo é "outro".
	if reason.ReasonCode == "other" && reason.ReasonDetails == "" {
		response.Error(w, http.StatusBadRequest, "Preencha a observação para informar outro motivo.")
		return
	}

	if utf8.RuneCountInString(reason.ReasonDetails) > 500 ||
		strings.ContainsRune(reason.ReasonDetails, 0) {

		response.Error(w, http.StatusBadRequest, "A observação deve conter até 500 caracteres válidos.")
		return
	}

	// Somente o motivo "outro" possui observação.
	if reason.ReasonCode != "other" {
		reason.ReasonDetails = ""
	}

	order, changed, err := h.Store.CancelOrder(
		r.Context(),
		userID,
		id,
		reason,
	)

	switch {

	case errors.Is(err, repositories.ErrOrderForbidden):
		response.Error(w, http.StatusForbidden, err.Error())

	case errors.Is(err, sql.ErrNoRows):
		response.Error(w, http.StatusNotFound, "Pedido não encontrado")

	case errors.Is(err, repositories.ErrOrderNotCancellable),
		errors.Is(err, repositories.ErrOrderRestock):

		response.Error(w, http.StatusConflict, err.Error())

	case err != nil:
		response.Error(w, http.StatusInternalServerError, "Não foi possível cancelar o pedido. Tente novamente.")

	default:

		message := "Pedido já cancelado"

		// Notifica somente quando o cancelamento
		// realmente modificou o pedido.
		if changed {

			message = "Pedido cancelado com sucesso"

			if h.NotifyCancelled != nil {
				h.NotifyCancelled(userID, order)
			}
		}

		response.Success(w, http.StatusOK, message, order)
	}
}

func parseOrderFilters(r *http.Request) (models.OrderFilters, error) {

	return parseOrderFilterValues(r.URL.Query(), false)
}

func parseOrderFilterValues(query url.Values, administrative bool) (models.OrderFilters, error) {
	var filters models.OrderFilters

	// Valida a pesquisa textual.
	filters.Search = strings.TrimSpace(query.Get("search"))

	if utf8.RuneCountInString(filters.Search) > 200 ||
		strings.ContainsRune(filters.Search, 0) {

		return filters, errors.New("Busca inválida")
	}

	// Processa o filtro de pedidos cancelados.
	if status := query.Get("status"); status != "" && !administrative {

		if status != "cancelled" {
			return filters, errors.New("Status inválido")
		}

		filters.CancelledOnly = true
	}

	// Valida a ordenação.
	switch query.Get("sort") {

	case "", "recent":

	case "oldest":
		filters.Oldest = true

	default:
		return filters, errors.New("Ordenação inválida")
	}

	location, err := time.LoadLocation("America/Sao_Paulo")

	if err != nil {
		return filters, err
	}

	// Processa as datas inicial e final.
	for _, key := range []string{"dateFrom", "dateTo"} {

		if !query.Has(key) {
			continue
		}

		date, err := time.ParseInLocation(
			time.DateOnly,
			query.Get(key),
			location,
		)

		if err != nil || date.Year() < 1 {
			return filters, errors.New("Data inválida")
		}

		if key == "dateFrom" {

			filters.From = &date

		} else {

			// Transforma a data final em limite exclusivo.
			end := date.AddDate(0, 0, 1)

			filters.Until = &end
		}
	}

	// Verifica a consistência do intervalo.
	if filters.From != nil &&
		filters.Until != nil &&
		!filters.From.Before(*filters.Until) {

		return filters, errors.New("A data inicial deve ser anterior ou igual à final")
	}

	return filters, nil
}
