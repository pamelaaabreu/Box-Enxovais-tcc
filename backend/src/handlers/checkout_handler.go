package handlers

import (
	middlewares "backend/src/middleware"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/response"
	"backend/src/services"
	"context"
	"database/sql"
	"errors"
	"net/http"
	"regexp"
	"strconv"
	"strings"
)

// Define as operações necessárias para o checkout.
type checkoutStore interface {
	Get(context.Context, int, int64) (models.CheckoutOrder, error)
	Create(context.Context, int, models.CheckoutRequest) (models.CheckoutOrder, error)
}

type CheckoutHandler struct {
	Store  checkoutStore
	Notify func(int, models.CheckoutOrder)
}

func (h CheckoutHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet, http.MethodPost) {
		return
	}

	// Impede o armazenamento dos dados da compra em cache.
	w.Header().Set("Cache-Control", "no-store")

	userID, ok := middlewares.GetUserIDFromContext(r.Context())

	if !ok || userID <= 0 {
		response.Error(w, 401, "Faça login para finalizar a compra")
		return
	}

	// Consulta um pedido específico.
	if r.Method == http.MethodGet {

		id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)

		if err != nil || id <= 0 {
			response.Error(w, 400, "Pedido inválido")
			return
		}

		order, err := h.Store.Get(r.Context(), userID, id)

		if errors.Is(err, sql.ErrNoRows) {
			response.Error(w, 404, "Pedido não encontrado")
		} else if err != nil {
			response.Error(w, 500, "Não foi possível consultar o pedido. Tente novamente.")
		} else {
			response.Success(w, 200, "", order)
		}

		return
	}

	// Recebe os dados necessários para finalizar a compra.
	var input models.CheckoutRequest

	if !decodeBody(w, r, &input, smallJSONLimit, "Dados inválidos.") {
		return
	}

	// Normaliza o telefone.
	input.ContactPhone, ok = normalizeContactPhone(input.ContactPhone)

	// Valida o endereço, a chave da requisição
	// e o valor esperado pelo cliente.
	if !ok ||
		input.AddressID < 0 ||
		(input.AddressID > 0 && input.SaveAddress) ||
		(input.AddressID == 0 && !validShippingAddress(&input.Address)) ||
		!requestKeyPattern.MatchString(input.RequestKey) ||
		input.ExpectedTotalCents < 0 {

		response.Error(w, 400, "Confira o endereço, o telefone e os dados da compra")
		return
	}

	// Valida as formas de pagamento simuladas.
	if input.PaymentMethod != "pix" &&
		input.PaymentMethod != "card" &&
		input.PaymentMethod != "boleto" {

		response.Error(w, 400, "Forma de pagamento simulada inválida")
		return
	}

	// Valida o parcelamento.
	if _, err := models.NormalizeInstallments(input.PaymentMethod, input.Installments); err != nil {
		response.Error(w, 400, err.Error())
		return
	}

	// Encaminha a compra para persistência.
	order, err := h.Store.Create(r.Context(), userID, input)

	if err != nil {

		if errors.Is(err, repositories.ErrCheckoutAddress) {
			response.Error(w, 404, "Endereço não encontrado")

		} else if errors.Is(err, repositories.ErrCheckoutPostalCode) {
			response.Error(w, 400, "Informe um CEP válido.")

		} else if errors.Is(err, repositories.ErrCheckoutDeliveryUnavailable) {
			response.Error(w, 422, "Entrega indisponível para este CEP no momento.")

		} else if errors.Is(err, repositories.ErrCheckoutConflict) {
			response.Error(w, 409, err.Error())

		} else {
			response.Error(w, 500, "Não foi possível concluir a compra. Tente novamente.")
		}

		return
	}

	// Solicita o envio do comprovante quando existem
	// itens disponíveis para compor a notificação.
	if h.Notify != nil && len(order.ReceiptItems) > 0 {
		h.Notify(userID, order)
	}

	response.Success(
		w,
		200,
		"Compra simulada aprovada. Nenhuma cobrança foi realizada.",
		order,
	)
}

func validShippingAddress(address *models.ShippingAddress) bool {
	return services.ValidShippingAddress(address)
}

var requestKeyPattern = regexp.MustCompile(`^[a-zA-Z0-9-]{16,80}$`)
