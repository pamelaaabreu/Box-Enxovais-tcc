package services

import (
	"backend/src/models"
	"backend/src/pagination"
	"backend/src/repositories"
	"context"
	"net/url"
)

type FavoritesService struct {
	Store repositories.FavoritesRepository
}

func (service FavoritesService) List(ctx context.Context, userID int, values url.Values) (pagination.Page[models.Product], error) {
	query, err := pagination.ParsePage(values, productFilterFields, 2)
	if err != nil {
		return pagination.Page[models.Product]{}, ValidationError(err.Error())
	}
	return service.Store.List(ctx, userID, query)
}
