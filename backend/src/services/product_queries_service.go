package services

import (
	"context"

	"backend/src/models"
	"backend/src/pagination"
)

// Busca um produto pelo ID.
func (service ProductService) Get(ctx context.Context, id int64) ([]models.Product, error) {
	return service.Store.Get(ctx, id)
}

// Lista os tipos de produtos.
func (service ProductService) ListTypes(ctx context.Context) ([]models.ProductType, error) {
	return service.Store.ListTypes(ctx)
}

// Lista os produtos do catálogo.
func (service ProductService) List(ctx context.Context, page pagination.PageQuery) (pagination.Page[models.Product], error) {
	return service.Store.List(ctx, page)
}

// Lista os produtos promocionais.
func (service ProductService) ListPromotional(ctx context.Context, name string, page pagination.PageQuery) (pagination.Page[models.Product], error) {
	return service.Store.ListPromotional(ctx, name, page)
}

// Lista os produtos para o painel administrativo.
func (service ProductService) ListAdmin(ctx context.Context, page pagination.PageQuery) (pagination.Page[models.Product], error) {
	return service.Store.ListAdmin(ctx, page)
}
