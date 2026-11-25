package services

import (
	"context"
	"errors"
	"strings"

	"backend/src/models"

	"github.com/lib/pq"
)

var ErrProductQuantity = errors.New("Informe uma quantidade em estoque inteira entre 0 e 2147483647")
var ErrProductSKU = errors.New("Não foi possível gerar o código do produto. Tente novamente.")
var ErrProductSKUConflict = ErrProductSKU

const maxSKUGenerationAttempts = 3

func (service ProductService) Create(ctx context.Context, product models.Product, quantity *int32) (int, error) {
	product.Name = strings.TrimSpace(product.Name)
	categoryID := 0
	if product.ProductTypeID != nil {
		categoryID = *product.ProductTypeID
	}
	description := ""
	if product.Description != nil {
		description = *product.Description
	}
	care := ""
	if product.CareInstructions != nil {
		care = *product.CareInstructions
	}
	if !validProductDetails(product.Name, description, care, categoryID, product.BrandID, product.Status, product.Measurements) {
		return 0, ErrProductDetails
	}
	product.Variants = normalizeVariants(product.Variants)
	if err := validateVariants(product.Variants, true); err != nil {
		return 0, err
	}
	if len(product.Variants) > 0 {
		var total int64
		product.Price = product.Variants[0].Price
		for _, variant := range product.Variants {
			total += int64(variant.Stock)
			if variant.Price < product.Price {
				product.Price = variant.Price
			}
		}
		value := int32(total)
		quantity = &value
	}
	if quantity == nil || *quantity < 0 {
		return 0, ErrProductQuantity
	}
	product.Quantity = int(*quantity)
	if !validProductPrice(product.Price) {
		return 0, ErrProductDetails
	}
	// O trigger/sequence da migration 48 é o único gerador oficial.
	product.SKU = ""
	for attempt := 0; attempt < maxSKUGenerationAttempts; attempt++ {
		id, err := service.Store.Create(ctx, product)
		var pg *pq.Error
		if !errors.As(err, &pg) || pg.Code != "23505" || pg.Constraint != "products_sku_key" {
			return id, err
		}
		if err = ctx.Err(); err != nil {
			return 0, err
		}
	}
	return 0, ErrProductSKU
}
