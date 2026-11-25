package handlers

import (
	middlewares "backend/src/middleware"
	"backend/src/repositories"
	"backend/src/response"
	"errors"
	"log"
	"net/http"
	"strconv"
)

type CartHandler struct {
	Store repositories.CartRepository
}

func (h CartHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet, http.MethodPost, http.MethodPatch, http.MethodDelete) {
		return
	}

	// Impede o armazenamento do carrinho em cache.
	w.Header().Set("Cache-Control", "no-store")

	// Recupera o ID do usuário autenticado.
	userID, ok := middlewares.GetUserIDFromContext(r.Context())

	if !ok || userID <= 0 {
		response.Error(w, 401, "Faça login para acessar o carrinho")
		return
	}

	// Define a consulta como operação padrão.
	operation := repositories.CartGet

	var id, quantity, variantID int64

	// Valida o identificador recebido pela URL.
	if r.PathValue("id") != "" {
		var err error

		id, err = strconv.ParseInt(r.PathValue("id"), 10, 64)

		if err != nil || id <= 0 {
			response.Error(w, 400, "Item inválido")
			return
		}
	}

	switch r.Method {

	case http.MethodPost:

		// Identifica uma operação de recompra.
		if r.PathValue("orderID") != "" {
			var err error

			id, err = strconv.ParseInt(r.PathValue("orderID"), 10, 64)

			if err != nil || id <= 0 {
				response.Error(w, 404, "Pedido não encontrado")
				return
			}

			operation = repositories.CartReorder
			break
		}

		// Estrutura dos dados necessários para adicionar um item.
		var body struct {
			ProductID int64 `json:"productId"`
			VariantID int64 `json:"variantId"`
			Quantity  int64 `json:"quantity"`
		}

		// Valida os dados recebidos.
		if !decodeBody(w, r, &body, smallJSONLimit, "Dados inválidos.") {
			return
		}
		if body.ProductID <= 0 ||
			body.VariantID < 0 ||
			body.Quantity < 1 ||
			body.Quantity > repositories.MaxCartQuantity {

			response.Error(w, 400, "Produto ou quantidade inválidos")
			return
		}

		operation = repositories.CartAdd
		id = body.ProductID
		variantID = body.VariantID
		quantity = body.Quantity

	case http.MethodPatch:

		// Recebe a nova quantidade do item.
		var body struct {
			Quantity int64 `json:"quantity"`
		}

		if !decodeBody(w, r, &body, smallJSONLimit, "Dados inválidos.") {
			return
		}
		if body.Quantity < 1 ||
			body.Quantity > repositories.MaxCartQuantity {

			response.Error(w, 400, "Quantidade inválida")
			return
		}

		operation = repositories.CartUpdate
		quantity = body.Quantity

	case http.MethodDelete:

		// Sem ID, limpa todo o carrinho.
		operation = repositories.CartClear

		// Com ID, remove apenas um item.
		if id > 0 {
			operation = repositories.CartRemove
		}
	}

	// Encaminha a operação ao repository.
	cart, err := h.Store.Apply(
		r.Context(),
		userID,
		operation,
		id,
		quantity,
		variantID,
	)

	if err != nil {
		status := 500
		message := "Não foi possível atualizar o carrinho. Tente novamente."

		// Converte os erros do repository em respostas HTTP.
		switch {

		case errors.Is(err, repositories.ErrCartItemNotFound),
			errors.Is(err, repositories.ErrCartOrderNotFound):

			status = 404
			message = err.Error()

		case errors.Is(err, repositories.ErrCartProduct),
			errors.Is(err, repositories.ErrCartQuantity):

			status = 409
			message = err.Error()

		default:
			log.Printf("cart operation failed: %v", err)
		}

		response.Error(w, status, message)
		return
	}

	// Retorna o carrinho atualizado.
	response.Success(w, 200, "", cart)
}
