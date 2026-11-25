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

	// Usa o parâmetro da rota; mantém compatibilidade com chamadas diretas.
	rawID := r.PathValue("id")
	if rawID == "" {
		rawID = strings.TrimPrefix(r.URL.Path, "/products/")
	}
	id, err := strconv.ParseInt(
		rawID,
		10,
		64,
	)

	if err != nil || id <= 0 {
		response.Error(w, http.StatusBadRequest, "ID inválido")
		return
	}

	products, err := h.Service.Get(r.Context(), id)

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Erro ao buscar produto")
		return
	}

	// Verifica se algum produto foi encontrado.
	if len(products) == 0 {
		response.Error(w, http.StatusNotFound, "Produto não encontrado")
		return
	}

	// Retorna somente o primeiro produto encontrado.
	response.JSON(w, http.StatusOK, products[0])
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

	products, err := h.Service.ListRelated(r.Context(), id)

	if err != nil {
		log.Println("list related products")
		response.Error(w, http.StatusInternalServerError, "Erro ao buscar produtos relacionados")
		return
	}

	response.JSON(w, http.StatusOK, products)
}
