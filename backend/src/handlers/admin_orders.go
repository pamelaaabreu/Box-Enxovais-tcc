package handlers

import (
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/response"
	"context"
	"database/sql"
	"errors"
	"net/http"
	"strconv"
)

type AdminOrdersHandler struct {
	Store           repositories.CheckoutRepository
	NotifyCancelled func(int, models.OrderDetails)
}
type adminCancellationStore struct {
	repositories.CheckoutRepository
}

func (s adminCancellationStore) CancelOrder(ctx context.Context, actor int, id int64, reason models.CancellationReason) (models.OrderDetails, bool, error) {
	return s.CancelAdminOrder(ctx, actor, id, reason)
}
func (h AdminOrdersHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if raw := r.PathValue("id"); raw != "" {
		id, err := strconv.ParseInt(raw, 10, 64)
		if err != nil || id <= 0 {
			response.Error(w, 404, "Pedido não encontrado")
			return
		}
		if r.Method == http.MethodPost {
			handler := OrderHistoryHandler{Store: adminCancellationStore{h.Store}, NotifyCancelled: func(_ int, order models.OrderDetails) {
				if h.NotifyCancelled != nil {
					h.NotifyCancelled(order.OwnerID, order)
				}
			}}
			handler.ServeHTTP(w, r)
			return
		}
		order, err := h.Store.GetAdminOrder(r.Context(), id)
		if errors.Is(err, sql.ErrNoRows) {
			response.Error(w, 404, "Pedido não encontrado")
			return
		}
		if err != nil {
			response.Error(w, 500, "Não foi possível consultar o pedido.")
			return
		}
		response.Success(w, 200, "", order)
		return
	}
	page := 1
	if raw := r.URL.Query().Get("page"); raw != "" {
		n, err := strconv.Atoi(raw)
		if err != nil || n < 1 || n > 1000000 {
			response.Error(w, 400, "Página inválida")
			return
		}
		page = n
	}
	status := r.URL.Query().Get("status")
	if status != "" && status != "simulated_approved" && status != "cancelled" {
		response.Error(w, 400, "Status inválido")
		return
	}
	clone := r.Clone(r.Context())
	urlCopy := *r.URL
	clone.URL = &urlCopy
	q := clone.URL.Query()
	q.Del("status")
	clone.URL.RawQuery = q.Encode()
	filters, err := parseOrderFilters(clone)
	if err != nil {
		response.Error(w, 400, err.Error())
		return
	}
	if filters.Oldest {
		response.Error(w, 400, "Ordenação inválida")
		return
	}
	orders, err := h.Store.ListAdminOrders(r.Context(), 10, (page-1)*10, filters, status)
	if err != nil {
		response.Error(w, 500, "Não foi possível carregar os pedidos.")
		return
	}
	response.Success(w, 200, "", orders)
}
