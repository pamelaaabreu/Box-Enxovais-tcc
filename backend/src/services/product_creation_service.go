package services

import (
	"backend/src/models"
	"context"
	"errors"
	"regexp"
	"strings"

	"github.com/lib/pq"
)

var ErrProductQuantity = errors.New("Informe uma quantidade em estoque inteira entre 0 e 2147483647")

var ErrProductSKU = errors.New("Informe um SKU de 3 a 32 caracteres, usando letras, números e hífens.")
var ErrProductSKUConflict = errors.New("Este SKU já está cadastrado. Informe outro código.")
var productSKUFormat = regexp.MustCompile(`^[A-Z0-9]+(-[A-Z0-9]+)*$`)

func (service ProductService) Create(ctx context.Context, product models.Product, quantity *int32) (int, error) {
	if err := validateVariants(product.Variants, true); err != nil {
		return 0, err
	}
	if len(product.Variants) > 0 {
		total := int32(0)
		product.Price = product.Variants[0].Price
		for _, v := range product.Variants {
			total += int32(v.Stock)
			if v.Price < product.Price {
				product.Price = v.Price
			}
		}
		quantity = &total
	}
	if quantity == nil || *quantity < 0 {
		return 0, ErrProductQuantity
	}
	product.Quantity = int(*quantity)
	product.SKU = strings.ToUpper(strings.TrimSpace(product.SKU))
	if product.SKU != "" && (len(product.SKU) < 3 || len(product.SKU) > 32 || !productSKUFormat.MatchString(product.SKU)) {
		return 0, ErrProductSKU
	}
	id, err := service.Store.Create(ctx, product)
	var databaseError *pq.Error
	if errors.As(err, &databaseError) && databaseError.Code == "23505" && databaseError.Constraint == "products_sku_key" {
		return 0, ErrProductSKUConflict
	}
	return id, err
}
