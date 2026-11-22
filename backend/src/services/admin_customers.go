package services

import (
	"backend/src/models"
	"backend/src/repositories"
	"context"
)

type AdminCustomerService struct {
	Store repositories.AdminCustomerRepository
}

func (s AdminCustomerService) List(ctx context.Context, search string, page int) (models.AdminCustomerPage, error) {
	return s.Store.List(ctx, search, 10, (page-1)*10)
}
func (s AdminCustomerService) Detail(ctx context.Context, id int) (models.AdminCustomerDetails, error) {
	return s.Store.Detail(ctx, id)
}
func (s AdminCustomerService) Orders(ctx context.Context, id, page int) (models.AdminOrderPage, error) {
	return s.Store.Orders(ctx, id, 10, (page-1)*10)
}
