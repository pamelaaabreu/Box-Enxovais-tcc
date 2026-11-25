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

// Adaptador que incorpora o repository de checkout.
type adminCancellationStore struct {
	repositories.CheckoutRepository
}

// Redireciona o cancelamento comum para o administrativo.
func (s adminCancellationStore) CancelOrder(ctx context.Context, actor int, id int64, reason models.CancellationReason) (models.OrderDetails, bool, error) {

	return s.CancelAdminOrder(ctx, actor, id, reason)
}

func (h AdminOrdersHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet, http.MethodPost) {
		return
	}

	w.Header().Set("Cache-Control", "no-store")

	// Verifica se existe um pedido específico na URL.
	if raw := r.PathValue("id"); raw != "" {

		id, err := strconv.ParseInt(raw, 10, 64)

		if err != nil || id <= 0 {
			response.Error(w, http.StatusNotFound, "Pedido não encontrado")
			return
		}

		// POST representa o cancelamento administrativo.
		if r.Method == http.MethodPost {

			// Reutiliza o handler de histórico de pedidos,
			// substituindo o comportamento de cancelamento.
			handler := OrderHistoryHandler{
				Store: adminCancellationStore{h.Store},

				NotifyCancelled: func(_ int, order models.OrderDetails) {

					if h.NotifyCancelled != nil {

						// Notifica o proprietário do pedido,
						// não o administrador responsável.
						h.NotifyCancelled(order.OwnerID, order)
					}
				},
			}

			handler.ServeHTTP(w, r)
			return
		}

		// Consulta os detalhes administrativos do pedido.
		order, err := h.Store.GetAdminOrder(r.Context(), id)

		if errors.Is(err, sql.ErrNoRows) {
			response.Error(w, http.StatusNotFound, "Pedido não encontrado")
			return
		}

		if err != nil {
			response.Error(w, http.StatusInternalServerError, "Não foi possível consultar o pedido.")
			return
		}

		response.Success(w, http.StatusOK, "", order)
		return
	}

	// Valida a página solicitada.
	page, pageErr := requestPage(r.URL.Query().Get("page"), maximumRequestPage)
	if pageErr != nil {
		response.Error(w, http.StatusBadRequest, "Página inválida")
		return
	}

	// Valida os status permitidos no painel administrativo.
	status := r.URL.Query().Get("status")

	if status != "" &&
		status != "simulated_approved" &&
		status != "cancelled" {

		response.Error(w, http.StatusBadRequest, "Status inválido")
		return
	}

	filters, err := parseOrderFilterValues(r.URL.Query(), true)

	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	// Não permite a ordenação por pedidos mais antigos.
	if filters.Oldest {
		response.Error(w, http.StatusBadRequest, "Ordenação inválida")
		return
	}

	// Recupera os pedidos administrativos paginados.
	orders, err := h.Store.ListAdminOrders(
		r.Context(),
		10,
		(page-1)*10,
		filters,
		status,
	)

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Não foi possível carregar os pedidos.")
		return
	}

	response.Success(w, http.StatusOK, "", orders)
}
