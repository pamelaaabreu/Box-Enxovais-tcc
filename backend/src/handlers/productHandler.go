package handlers

import (
	"backend/src/models"
	"backend/src/pagination"
	"backend/src/response"
	"backend/src/services"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"net/url"
	"strconv"
	"strings"
)

type ProductHandler struct{ Service services.ProductService }

func (h ProductHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	var body struct {
		models.Product
		Quantity *int32 `json:"quantity"`
	}
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&body); err != nil {
		response.Error(w, 400, "Quantidade em estoque deve ser um inteiro maior ou igual a zero; verifique os dados enviados")
		return
	}
	if decoder.Decode(&struct{}{}) != io.EOF {
		response.Error(w, 400, "Informe uma quantidade em estoque inteira entre 0 e 2147483647")
		return
	}
	productID, err := h.Service.Create(r.Context(), body.Product, body.Quantity)
	if errors.Is(err, services.ErrProductQuantity) {
		response.Error(w, 400, err.Error())
		return
	}
	if err != nil {
		log.Printf("Erro ao inserir produto: %v", err)
		response.Error(w, 500, "Erro ao criar produto")
		return
	}

	response.JSON(w, http.StatusCreated, map[string]int{"id": productID})
}

// Product listing and detail share the same data shape used by the storefront.
func (h ProductHandler) GetProduct(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.ParseInt(strings.TrimPrefix(r.URL.Path, "/products/"), 10, 64)
	if err != nil || id <= 0 {
		response.Error(w, 400, "ID inválido")
		return
	}
	products, err := h.Service.Get(r.Context(), id)
	if err != nil {
		response.Error(w, 500, "Erro ao buscar produto")
		return
	}
	if len(products) == 0 {
		response.Error(w, 404, "Produto não encontrado")
		return
	}
	response.JSON(w, 200, products[0])
}

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
