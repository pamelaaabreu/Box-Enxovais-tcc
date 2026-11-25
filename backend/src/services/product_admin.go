package services

import (
	"context"
	"errors"
	"math"
	"strings"
	"unicode/utf8"

	"backend/src/models"
)

const (
	maxProductNameCharacters = 100
	maxProductTextCharacters = 20000
	maxProductMeasurements   = 200
	maxProductPrice          = 99999999.99
)

var ErrProductDetails = errors.New("Confira nome, categoria, status e características do produto.")

func (service ProductService) Update(ctx context.Context, id int64, product models.ProductUpdateRequest) error {

	// Normaliza o nome do produto.
	product.Name = strings.TrimSpace(product.Name)

	if id <= 0 || product.ExpectedUpdatedAt.IsZero() || !validProductDetails(product.Name, product.Description, product.CareInstructions, product.ProductTypeID, product.BrandID, product.Status, product.Measurements) {
		return ErrProductDetails
	}
	product.Variants = normalizeVariants(product.Variants)

	// Valida as variantes durante a edição.
	if err := validateVariants(product.Variants, false); err != nil {
		return err
	}

	// Produtos sem variantes precisam informar
	// os dados comerciais gerais.
	if len(product.Variants) == 0 && product.Commerce == nil {
		return ErrProductDetails
	}

	if err := validateCommerce(product.Variants, product.Commerce); err != nil {
		return err
	}

	return service.Store.Update(ctx, id, product)
}

// Valida o preço e sua precisão monetária.
func validProductPrice(value float64) bool {
	return !math.IsNaN(value) &&
		!math.IsInf(value, 0) &&
		value > 0 &&
		value <= maxProductPrice &&
		math.Abs(value*100-math.Round(value*100)) <= 0.00001
}
func validProductDetails(name string, description string, care string, categoryID int, brandID *int, status string, measurements map[string]string) bool {
	if strings.TrimSpace(name) == "" || utf8.RuneCountInString(name) > maxProductNameCharacters || categoryID <= 0 || (brandID != nil && *brandID <= 0) || utf8.RuneCountInString(description) > maxProductTextCharacters || utf8.RuneCountInString(care) > maxProductTextCharacters || len(measurements) > maxProductMeasurements {
		return false
	}
	if status != "active" && status != "inactive" && status != "archived" {
		return false
	}
	for key, value := range measurements {
		if strings.TrimSpace(key) == "" || utf8.RuneCountInString(key) > maxProductNameCharacters || utf8.RuneCountInString(value) > maxProductTextCharacters || strings.ContainsRune(key, 0) || strings.ContainsRune(value, 0) {
			return false
		}
	}
	return !strings.ContainsRune(name, 0) && !strings.ContainsRune(description, 0) && !strings.ContainsRune(care, 0)
}
