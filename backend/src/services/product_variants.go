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
	maxProductVariants             = 50
	maxVariantNameCharacters       = 60
	maxVariantDimensionsCharacters = 500
)

var ErrProductVariants = errors.New("Revise as variações: informe nomes únicos, dimensões, preços maiores que zero e estoques inteiros não negativos")

func validateVariants(items []models.ProductVariant, creating bool) error {

	// Limita a quantidade de variantes por produto.
	if len(items) > maxProductVariants {
		return ErrProductVariants
	}

	// Maps utilizados para identificar duplicidades.
	names := map[string]bool{}
	ids := map[int64]bool{}

	total := int64(0)

	for _, v := range items {

		// Normaliza o nome para identificar duplicidades.
		name := strings.ToLower(strings.TrimSpace(v.Size))

		if name == "" ||
			utf8.RuneCountInString(strings.TrimSpace(v.Size)) > maxVariantNameCharacters ||
			names[name] ||
			strings.ContainsRune(v.Size, 0) || strings.ContainsRune(v.Dimensions, 0) ||
			v.ID < 0 ||
			(creating && v.ID != 0) ||
			(v.ID != 0 && ids[v.ID]) ||
			strings.TrimSpace(v.Dimensions) == "" ||
			utf8.RuneCountInString(v.Dimensions) > maxVariantDimensionsCharacters ||
			!validProductPrice(v.Price) ||
			v.Stock < 0 ||
			int64(v.Stock) > math.MaxInt32 {

			return ErrProductVariants
		}

		// Registra os nomes e IDs já processados.
		for _, item := range v.IncludedItems {
			if strings.ContainsRune(item, 0) {
				return ErrProductVariants
			}
		}
		names[name] = true
		ids[v.ID] = true

		// Acumula o estoque utilizando int64.
		total += int64(v.Stock)
	}

	// Garante que o estoque consolidado respeite
	// o limite do tipo integer do PostgreSQL.
	if total > math.MaxInt32 {
		return ErrProductVariants
	}

	return nil
}

func (service ProductService) SaveVariants(ctx context.Context, id int64, items, expected []models.ProductVariant, commerce ...*models.ProductCommerceChange) ([]models.ProductVariant, error) {

	if id <= 0 {
		return nil, ErrProductVariants
	}

	items = normalizeVariants(items)
	// Valida as variantes que serão persistidas.
	if err := validateVariants(items, false); err != nil {
		return nil, err
	}

	if len(commerce) > 1 {
		return nil, ErrProductVariants
	}
	if len(commerce) == 1 {
		if err := validateCommerce(items, commerce[0]); err != nil {
			return nil, err
		}
	}

	// Encaminha as variantes atuais e esperadas
	// para o repository controlar a concorrência.
	return service.Store.SaveVariants(ctx, id, items, expected, commerce...)
}

func normalizeVariants(items []models.ProductVariant) []models.ProductVariant {
	if items == nil {
		return nil
	}
	result := append([]models.ProductVariant{}, items...)
	for i := range result {
		result[i].Size = strings.TrimSpace(result[i].Size)
		result[i].Dimensions = strings.TrimSpace(result[i].Dimensions)
	}
	return result
}
func validateCommerce(items []models.ProductVariant, commerce *models.ProductCommerceChange) error {
	if commerce != nil && (len(items) > 0 || !validProductPrice(commerce.Price) || commerce.Quantity < 0 || int64(commerce.Quantity) > math.MaxInt32) {
		return ErrProductVariants
	}
	return nil
}
