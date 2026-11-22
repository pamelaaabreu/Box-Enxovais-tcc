package services

import (
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"database/sql"
	"errors"
)

var ErrPromotionInvalid = errors.New("Confira o nome, período e imagem da campanha; o desconto deve ser menor que o preço e não se aplica a variantes.")
var ErrPromotionNotFound = errors.New("promotion not found")
var ErrPromotionLookup = errors.New("promotion lookup failed")

type PromotionService struct {
	Store     repositories.PromotionRepository
	UploadDir string
}

func (service PromotionService) Create(ctx context.Context, request models.CreatePromotionRequest) (int, error) {
	request, err := service.validate(ctx, request)
	if err != nil {
		return 0, err
	}
	return service.save(ctx, 0, request)
}
func (service PromotionService) Update(ctx context.Context, id int, request models.CreatePromotionRequest) (int, error) {
	request, err := service.validate(ctx, request)
	if err != nil {
		return 0, err
	}
	return service.save(ctx, id, request)
}
func (service PromotionService) save(ctx context.Context, id int, request models.CreatePromotionRequest) (int, error) {
	result, err := service.Store.Save(ctx, id, request)
	if errors.Is(err, repositories.ErrCampaignInvalid) {
		return 0, ErrPromotionInvalid
	}
	if errors.Is(err, sql.ErrNoRows) {
		return 0, ErrPromotionNotFound
	}
	return result, err
}
