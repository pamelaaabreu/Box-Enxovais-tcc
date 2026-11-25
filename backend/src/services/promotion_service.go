package services

import (
	"context"
	"database/sql"
	"errors"

	"backend/src/models"
	"backend/src/repositories"
)

var ErrPromotionInvalid = errors.New("Confira o nome, período e imagem da campanha; o desconto deve ser menor que o preço e não se aplica a variantes.")
var ErrPromotionNotFound = errors.New("promotion not found")
var ErrPromotionLookup = errors.New("promotion lookup failed")

type PromotionService struct {
	Store     repositories.PromotionRepository
	UploadDir string
}

// Cadastra uma nova campanha.
func (service PromotionService) Create(ctx context.Context, request models.CreatePromotionRequest) (int, error) {

	// Valida e normaliza os dados.
	request, err := service.validate(ctx, request)

	if err != nil {
		return 0, err
	}

	// ID zero representa uma nova campanha.
	return service.save(ctx, 0, request)
}

// Atualiza uma campanha existente.
func (service PromotionService) Update(ctx context.Context, id int, request models.CreatePromotionRequest) (int, error) {
	if id <= 0 {
		return 0, ErrPromotionNotFound
	}

	request, err := service.validate(ctx, request)

	if err != nil {
		return 0, err
	}

	return service.save(ctx, id, request)
}

// Centraliza a persistência e o tratamento de erros.
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
