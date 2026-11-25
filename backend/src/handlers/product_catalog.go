package handlers

import (
	"backend/src/models"
	"backend/src/pagination"
	"backend/src/response"
	"log"
	"net/http"
	"net/url"
	"strings"
)

// Lista os produtos do catálogo público.
func (h ProductHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}
	h.writeProductPage(w, r, nil, false)
}

// Lista os produtos do painel administrativo.
func (h ProductHandler) ListAdminProducts(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}
	w.Header().Set("Cache-Control", "no-store")

	h.writeProductPage(w, r, nil, true)
}

// Centraliza o processamento das listagens.
func (h ProductHandler) writeProductPage(w http.ResponseWriter, r *http.Request, promotion *string, admin bool) {

	// Interpreta os parâmetros recebidos pela URL.
	values, err := url.ParseQuery(r.URL.RawQuery)

	if err != nil {
		response.Error(w, http.StatusBadRequest, "Parâmetros de consulta inválidos")
		return
	}

	// Valida os filtros e a paginação.
	// promotion != nil identifica o catálogo promocional.
	pageQuery, err := h.Service.ParsePage(values, promotion != nil)

	if err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	var page pagination.Page[models.Product]

	// Seleciona a listagem correspondente.
	if admin {
		page, err = h.Service.ListAdmin(r.Context(), pageQuery)
	} else if promotion == nil {
		page, err = h.Service.List(r.Context(), pageQuery)
	} else {
		page, err = h.Service.ListPromotional(r.Context(), *promotion, pageQuery)
	}

	if err != nil {
		log.Println("list products")
		response.Error(w, http.StatusInternalServerError, "Erro ao buscar produtos")
		return
	}

	response.JSON(w, http.StatusOK, page)
}

// Lista os produtos de uma campanha promocional.
func (h ProductHandler) GetPromotionalProducts(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	// Extrai o nome da campanha a partir da URL.
	promoName := strings.TrimPrefix(r.URL.Path, "/api/promotions/")

	h.writeProductPage(w, r, &promoName, false)
}
