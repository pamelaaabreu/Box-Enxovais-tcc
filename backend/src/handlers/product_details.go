package handlers

import (
	"backend/src/response"
	"log"
	"net/http"
	"strconv"
	"strings"
)

// Recupera os detalhes de um produto.
func (h ProductHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	// Extrai e converte o ID recebido pela URL.
	id, err := strconv.ParseInt(
		strings.TrimPrefix(r.URL.Path, "/products/"),
		10,
		64,
	)

	if err != nil || id <= 0 {
		response.Error(w, 400, "ID inválido")
		return
	}

	products, err := h.Service.Get(r.Context(), id)

	if err != nil {
		response.Error(w, 500, "Erro ao buscar produto")
		return
	}

	// Verifica se algum produto foi encontrado.
	if len(products) == 0 {
		response.Error(w, 404, "Produto não encontrado")
		return
	}

	// Retorna somente o primeiro produto encontrado.
	response.JSON(w, 200, products[0])
}

// Recupera as recomendações de produtos relacionados.
func (h ProductHandler) ListRelatedProducts(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	// Obtém o ID diretamente do parâmetro da rota.
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)

	if err != nil || id <= 0 {
		response.Error(w, http.StatusBadRequest, "ID inválido")
		return
	}

	products, err := h.Service.Store.ListRelated(r.Context(), id)

	if err != nil {
		log.Printf("list related products: %v", err)
		response.Error(w, http.StatusInternalServerError, "Erro ao buscar produtos relacionados")
		return
	}

	response.JSON(w, http.StatusOK, products)
}
