package services

import (
	"backend/src/models"
	"backend/src/pagination"
	"backend/src/repositories"
	"context"
	"errors"
	"net/url"
)

var ErrProductQuantity = errors.New("Informe uma quantidade em estoque inteira entre 0 e 2147483647")

type ProductService struct {
	Store repositories.ProductRepository
}

func (service ProductService) Create(ctx context.Context, product models.Product, quantity *int32) (int, error) {
	if quantity == nil || *quantity < 0 {
		return 0, ErrProductQuantity
	}
	product.Quantity = int(*quantity)
	return service.Store.Create(ctx, product)
}

func (service ProductService) Get(ctx context.Context, id int64) ([]models.Product, error) {
	return service.Store.Get(ctx, id)
}

// Filters are mapped to public database fields; internal/sensitive fields are never inferred from requests.
var productFilterFields = map[string]pagination.FilterField{
	"id":                {Column: "page.id", Kind: "integer"},
	"name":              {Column: "page.name", Kind: "text"},
	"description":       {Column: "page.description", Kind: "text"},
	"care_instructions": {Column: "page.care_instructions", Kind: "text"},
	"price":             {Column: "page.price", Kind: "decimal"},
	"quantity":          {Column: "page.quantity", Kind: "integer"},
	"stock":             {Column: "page.quantity", Kind: "integer"},
	"status":            {Column: "page.status", Kind: "text"},
	"brand_id":          {Column: "page.brand_id", Kind: "integer"},
	"product_type_id":   {Column: "page.product_type_id", Kind: "integer"},
	"category_name":     {Column: "page.category_name", Kind: "text"},
	"created_at":        {Column: "page.created_at", Kind: "timestamp"},
	"updated_at":        {Column: "page.updated_at", Kind: "timestamp"},
}

func (service ProductService) ParsePage(values url.Values, promotional bool) (pagination.PageQuery, error) {
	fields := productFilterFields
	firstParameter := 1
	if promotional {
		fields = make(map[string]pagination.FilterField, len(productFilterFields)+1)
		for key, field := range productFilterFields {
			fields[key] = field
		}
		fields["promotional_price"] = pagination.FilterField{Column: "page.promotional_price", Kind: "decimal"}
		firstParameter = 2
	}
	return pagination.ParsePage(values, fields, firstParameter)
}

func (service ProductService) List(ctx context.Context, page pagination.PageQuery) (pagination.Page[models.Product], error) {
	return service.Store.List(ctx, page)
}

func (service ProductService) ListPromotional(ctx context.Context, name string, page pagination.PageQuery) (pagination.Page[models.Product], error) {
	return service.Store.ListPromotional(ctx, name, page)
}

func (service ProductService) ListAdmin(ctx context.Context, page pagination.PageQuery) (pagination.Page[models.Product], error) {
	return service.Store.ListAdmin(ctx, page)
}
