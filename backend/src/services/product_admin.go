package services

import (
	"backend/src/models"
	"context"
	"errors"
	"math"
	"strings"
	"unicode/utf8"
)

var ErrProductDetails = errors.New("Confira nome, categoria, status e características do produto.")

func (s ProductService) Update(ctx context.Context, id int64, product models.ProductUpdateRequest) error {
	product.Name = strings.TrimSpace(product.Name)
	if id <= 0 || product.Name == "" || utf8.RuneCountInString(product.Name) > 100 || product.ProductTypeID <= 0 || (product.BrandID != nil && *product.BrandID <= 0) || product.ExpectedUpdatedAt.IsZero() || utf8.RuneCountInString(product.Description) > 20000 || utf8.RuneCountInString(product.CareInstructions) > 20000 || len(product.Measurements) > 200 {
		return ErrProductDetails
	}
	if product.Status != "active" && product.Status != "inactive" && product.Status != "archived" {
		return ErrProductDetails
	}
	for key, value := range product.Measurements {
		if strings.TrimSpace(key) == "" || utf8.RuneCountInString(key) > 100 || utf8.RuneCountInString(value) > 20000 {
			return ErrProductDetails
		}
	}
	if err := validateVariants(product.Variants, false); err != nil {
		return err
	}
	if len(product.Variants) == 0 && product.Commerce == nil {
		return ErrProductDetails
	}
	if product.Commerce != nil {
		c := product.Commerce
		if len(product.Variants) > 0 || !validProductPrice(c.Price) || c.Quantity < 0 || int64(c.Quantity) > 2147483647 {
			return ErrProductVariants
		}
	}
	return s.Store.Update(ctx, id, product)
}

func validProductPrice(value float64) bool {
	return !math.IsNaN(value) && !math.IsInf(value, 0) && value > 0 && value <= 99999999.99 && math.Abs(value*100-math.Round(value*100)) <= 0.00001
}
