package services

import (
	"context"
	"math"

	"backend/src/models"
	"backend/src/repositories"
)

const adminCustomerPageSize = 10

func customerOffset(page int) (int, error) {
	if page < 1 || page-1 > math.MaxInt/adminCustomerPageSize {
		return 0, ValidationError("Página inválida")
	}
	return (page - 1) * adminCustomerPageSize, nil
}

type AdminCustomerService struct {
	Store repositories.AdminCustomerRepository
}

// Lista os clientes com paginação de 10 registros.
func (service AdminCustomerService) List(
	ctx context.Context,
	search string,
	page int,
) (models.AdminCustomerPage, error) {

	offset, err := customerOffset(page)
	if err != nil {
		return models.AdminCustomerPage{}, err
	}
	return service.Store.List(
		ctx,
		search,
		adminCustomerPageSize,
		offset,
	)
}

// Recupera os detalhes de um cliente.
func (service AdminCustomerService) Detail(
	ctx context.Context,
	id int,
) (models.AdminCustomerDetails, error) {

	return service.Store.Detail(ctx, id)
}

// Lista os pedidos de determinado cliente.
func (service AdminCustomerService) Orders(
	ctx context.Context,
	id, page int,
) (models.AdminOrderPage, error) {

	offset, err := customerOffset(page)
	if err != nil {
		return models.AdminOrderPage{}, err
	}
	return service.Store.Orders(
		ctx,
		id,
		adminCustomerPageSize,
		offset,
	)
}
