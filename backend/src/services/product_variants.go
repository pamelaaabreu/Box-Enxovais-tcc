package services

import (
	"backend/src/models"
	"context"
	"errors"
	"strings"
	"unicode/utf8"
)

var ErrProductVariants = errors.New("Revise as variações: informe nomes únicos, dimensões, preços maiores que zero e estoques inteiros não negativos")

func validateVariants(items []models.ProductVariant, creating bool) error {
	if len(items) > 50 {
		return ErrProductVariants
	}
	names := map[string]bool{}
	ids := map[int64]bool{}
	total := int64(0)
	for _, v := range items {
		name := strings.ToLower(strings.TrimSpace(v.Size))
		if name == "" ||
			utf8.RuneCountInString(strings.TrimSpace(v.Size)) > 60 ||
			names[name] ||
			v.ID < 0 ||
			(creating && v.ID != 0) ||
			(v.ID != 0 && ids[v.ID]) ||
			strings.TrimSpace(v.Dimensions) == "" ||
			utf8.RuneCountInString(v.Dimensions) > 500 ||
			!validProductPrice(v.Price) ||
			v.Stock < 0 ||
			int64(v.Stock) > 2147483647 {
			return ErrProductVariants
		}
		names[name] = true
		ids[v.ID] = true
		total += int64(v.Stock)
	}
	if total > 2147483647 {
		return ErrProductVariants
	}
	return nil
}

func (s ProductService) SaveVariants(ctx context.Context, id int64, items, expected []models.ProductVariant, commerce ...*models.ProductCommerceChange) ([]models.ProductVariant, error) {
	if id <= 0 {
		return nil, ErrProductVariants
	}
	if err := validateVariants(items, false); err != nil {
		return nil, err
	}
	if len(commerce) > 0 && commerce[0] != nil {
		c := commerce[0]
		if len(items) > 0 ||
			!validProductPrice(c.Price) ||
			c.Quantity < 0 ||
			int64(c.Quantity) > 2147483647 {
			return nil, ErrProductVariants
		}
	}
	return s.Store.SaveVariants(ctx, id, items, expected, commerce...)
}
