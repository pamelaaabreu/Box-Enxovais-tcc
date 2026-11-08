package services

import (
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"database/sql"
	"errors"
)

var ErrPromotionNotFound = errors.New("promotion not found")
var ErrPromotionLookup = errors.New("promotion lookup failed")

type PromotionService struct {
	Store repositories.PromotionRepository
}

func (service PromotionService) Create(ctx context.Context, request models.CreatePromotionRequest) (int, error) {
	return service.Store.Create(ctx, request)
}

func (service PromotionService) AddProduct(ctx context.Context, request models.AddToPromotionRequest) error {
	id, err := service.Store.FindActiveID(ctx, request.PromotionName)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrPromotionNotFound
	}
	if err != nil {
		return errors.Join(ErrPromotionLookup, err)
	}
	return service.Store.AddProduct(ctx, id, request)
}
