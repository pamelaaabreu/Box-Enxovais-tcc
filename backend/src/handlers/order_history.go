package handlers

import (
	middlewares "backend/src/middleware"
	"backend/src/models"
	"backend/src/response"
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strconv"
	"time"
	_ "time/tzdata"
)

type OrderHistoryHandler struct {
	Store interface {
		GetOrderDetails(context.Context, int, int64) (models.OrderDetails, error)
		ListOrders(context.Context, int, int, int, models.OrderFilters) ([]models.OrderHistoryEntry, error)
	}
}

func (h OrderHistoryHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	userID, ok := middlewares.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, http.StatusUnauthorized, "Faça login para consultar seus pedidos")
		return
	}

	if raw := r.PathValue("id"); raw != "" {
		id, err := strconv.ParseInt(raw, 10, 64)
		if err != nil || id <= 0 {
			response.Error(w, 404, "Pedido não encontrado")
			return
		}
		order, err := h.Store.GetOrderDetails(r.Context(), userID, id)
		if errors.Is(err, sql.ErrNoRows) {
			response.Error(w, 404, "Pedido não encontrado")
			return
		}
		if err != nil {
			response.Error(w, 500, "Não foi possível consultar o pedido")
			return
		}
		response.Success(w, 200, "", order)
		return
	}
	const pageSize = 10
	page := 1
	if raw := r.URL.Query().Get("page"); raw != "" {
		var err error
		page, err = strconv.Atoi(raw)
		if err != nil || page < 1 || page > 1000000 {
			response.Error(w, 400, "Página inválida")
			return
		}
	}
	filters, err := parseOrderFilters(r)
	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}
	orders, err := h.Store.ListOrders(r.Context(), userID, pageSize+1, (page-1)*pageSize, filters)
	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Não foi possível consultar seus pedidos")
		return
	}
	hasMore := len(orders) > pageSize
	if hasMore {
		orders = orders[:pageSize]
	}
	response.Success(w, 200, "", map[string]any{"orders": orders, "hasMore": hasMore})
}

func parseOrderFilters(r *http.Request) (models.OrderFilters, error) {
	var filters models.OrderFilters
	query := r.URL.Query()
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
	for _, key := range []string{"dateFrom", "dateTo"} {
		if !query.Has(key) {
			continue
		}
		date, err := time.ParseInLocation(time.DateOnly, query.Get(key), location)
		if err != nil || date.Year() < 1 {
			return filters, errors.New("Data inválida")
		}
		if key == "dateFrom" {
			filters.From = &date
		} else {
			end := date.AddDate(0, 0, 1)
			filters.Until = &end
		}
	}
	if filters.From != nil && filters.Until != nil && !filters.From.Before(*filters.Until) {
		return filters, errors.New("A data inicial deve ser anterior ou igual à final")
	}
	return filters, nil
}
