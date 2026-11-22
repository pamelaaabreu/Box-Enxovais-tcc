package services

import (
	"backend/src/models"
	"backend/src/pagination"
	"context"
)

func (service ProductService) Get(ctx context.Context, id int64) ([]models.Product, error) {
	return service.Store.Get(ctx, id)
}

func (service ProductService) ListTypes(ctx context.Context) ([]models.ProductType, error) {
	return service.Store.ListTypes(ctx)
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
