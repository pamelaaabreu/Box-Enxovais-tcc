package services

import (
	"context"
	"net/url"

	"backend/src/models"
	"backend/src/pagination"
	"backend/src/repositories"
)

type FavoritesService struct {
	Store repositories.FavoritesRepository
}

func (service FavoritesService) List(
	ctx context.Context,
	userID int,
	values url.Values,
) (pagination.Page[models.Product], error) {

	// Processa os parâmetros de paginação e filtros permitidos.
	query, err := pagination.ParsePage(
		values,
		productFilterFields,
		2,
	)

	// Converte o erro em um erro de validação.
	if err != nil {
		return pagination.Page[models.Product]{},
			ValidationError(err.Error())
	}

	// Encaminha os filtros e o ID do usuário ao repository.
	return service.Store.List(ctx, userID, query)
}
