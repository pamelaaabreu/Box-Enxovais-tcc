package handlers

import (
	"backend/src/models"
	"backend/src/response"
	"backend/src/services"
	"errors"
	"log"
	"net/http"
)

func (h ProductHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodPost) {
		return
	}

	// Utiliza a struct Product e redefine a quantidade
	// como um pointer para int32.
	var body struct {
		Name             string                  `json:"name"`
		Description      *string                 `json:"description"`
		CareInstructions *string                 `json:"care_instructions"`
		Measurements     map[string]string       `json:"measurements"`
		Price            float64                 `json:"price"`
		Quantity         *int32                  `json:"quantity"`
		BrandID          *int                    `json:"brand_id"`
		ProductTypeID    *int                    `json:"product_type_id"`
		Status           string                  `json:"status"`
		PurchaseSummary  *string                 `json:"purchase_summary"`
		Variants         []models.ProductVariant `json:"variants"`
		PromotionalPrice float64                 `json:"promotional_price"`
		SKU              string                  `json:"sku"`
	}
	if !decodeBody(w, r, &body, productJSONLimit, "Dados do produto inválidos. Confira os campos e os tipos informados.") {
		return
	}
	product := models.Product{Name: body.Name, Description: body.Description, CareInstructions: body.CareInstructions, Measurements: body.Measurements, Price: body.Price, BrandID: body.BrandID, ProductTypeID: body.ProductTypeID, Status: body.Status, PurchaseSummary: body.PurchaseSummary, Variants: body.Variants}

	// Encaminha os dados ao service.
	productID, err := h.Service.Create(
		r.Context(),
		product,
		body.Quantity,
	)

	// Trata conflitos de SKU.
	if errors.Is(err, services.ErrProductSKUConflict) {
		response.Error(w, 409, err.Error())
		return
	}

	// Trata erros de validação.
	if errors.Is(err, services.ErrProductDetails) || errors.Is(err, services.ErrProductQuantity) ||
		errors.Is(err, services.ErrProductSKU) ||
		errors.Is(err, services.ErrProductVariants) {

		response.Error(w, 400, err.Error())
		return
	}

	// Trata falhas internas.
	if err != nil {
		log.Printf("Erro ao inserir produto: %v", err)
		response.Error(w, 500, "Erro ao criar produto")
		return
	}

	// Retorna o ID do produto cadastrado.
	response.JSON(w, http.StatusCreated, map[string]int{
		"id": productID,
	})
}
