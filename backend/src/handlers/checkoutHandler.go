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
	"regexp"
	"strconv"
	"strings"
)

type checkoutStore interface {
	Get(context.Context, int, int64) (models.CheckoutOrder, error)
	Create(context.Context, int, models.CheckoutRequest) (models.CheckoutOrder, error)
}

type CheckoutHandler struct {
	Store  checkoutStore
	Notify func(int, models.CheckoutOrder)
}

func (h CheckoutHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	userID, ok := middlewares.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, 401, "Faça login para finalizar a compra")
		return
	}
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
	var input models.CheckoutRequest
	if !decodeCartBody(w, r, &input) {
		response.Error(w, 400, "Dados de checkout inválidos")
		return
	}
	a := &input.Address
	fields := []*string{&a.Recipient, &a.ZipCode, &a.Street, &a.Number, &a.Complement, &a.Neighborhood, &a.City, &a.State}
	for _, field := range fields {
		*field = strings.TrimSpace(*field)
	}
	valid := true
	for _, field := range []*string{&a.Recipient, &a.Street, &a.Number, &a.Neighborhood, &a.City} {
		if *field == "" || len(*field) > 200 {
			valid = false
		}
	}
	states := "|AC|AL|AP|AM|BA|CE|DF|ES|GO|MA|MT|MS|MG|PA|PB|PR|PE|PI|RJ|RN|RS|RO|RR|SC|SP|SE|TO|"
	if !valid || len(a.Complement) > 200 || len(a.State) != 2 || !strings.Contains(states, "|"+a.State+"|") || !regexp.MustCompile(`^[0-9]{5}-?[0-9]{3}$`).MatchString(a.ZipCode) || !regexp.MustCompile(`^[a-zA-Z0-9-]{16,80}$`).MatchString(input.RequestKey) || input.ExpectedTotalCents < 0 {
		response.Error(w, 400, "Confira o endereço e os dados da compra")
		return
	}
	if input.PaymentMethod != "pix" && input.PaymentMethod != "card" && input.PaymentMethod != "boleto" {
		response.Error(w, 400, "Forma de pagamento simulada inválida")
		return
	}
	order, err := h.Store.Create(r.Context(), userID, input)
	if err != nil {
		if errors.Is(err, repositories.ErrCheckoutConflict) {
			response.Error(w, 409, err.Error())
		} else {
			response.Error(w, 500, "Não foi possível concluir a compra. Tente novamente.")
		}
		return
	}
	if h.Notify != nil && len(order.ReceiptItems) > 0 {
		h.Notify(userID, order)
	}
	response.Success(w, 200, "Compra simulada aprovada. Nenhuma cobrança foi realizada.", order)
}
