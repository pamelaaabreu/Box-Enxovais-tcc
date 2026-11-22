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

func (h ProductHandler) ListProducts(w http.ResponseWriter, r *http.Request) {
	h.writeProductPage(w, r, nil, false)
}
func (h ProductHandler) ListAdminProducts(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	h.writeProductPage(w, r, nil, true)
}
func (h ProductHandler) writeProductPage(w http.ResponseWriter, r *http.Request, promotion *string, admin bool) {
	values, err := url.ParseQuery(r.URL.RawQuery)
	if err != nil {
		response.Error(w, 400, "Parâmetros de consulta inválidos")
		return
	}
	pageQuery, err := h.Service.ParsePage(values, promotion != nil)
	if err != nil {
		response.Error(w, 400, err.Error())
		return
	}
	var page pagination.Page[models.Product]
	if admin {
		page, err = h.Service.ListAdmin(r.Context(), pageQuery)
	} else if promotion == nil {
		page, err = h.Service.List(r.Context(), pageQuery)
	} else {
		page, err = h.Service.ListPromotional(r.Context(), *promotion, pageQuery)
	}
	if err != nil {
		log.Printf("list products: %v", err)
		response.Error(w, 500, "Erro ao buscar produtos")
		return
	}
	response.JSON(w, 200, page)
}
func (h ProductHandler) GetPromotionalProducts(w http.ResponseWriter, r *http.Request) {
	promoName := strings.TrimPrefix(r.URL.Path, "/api/promotions/")
	h.writeProductPage(w, r, &promoName, false)
}
