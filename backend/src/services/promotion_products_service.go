package services

import (
	"context"
	"database/sql"
	"errors"
	"math"

	"backend/src/models"
	"backend/src/repositories"
)

func (service PromotionService) AddProduct(ctx context.Context, request models.AddToPromotionRequest) error {

	// Valida o ID e o valor promocional.
	if request.ProductID <= 0 ||
		math.IsNaN(request.PromotionalPrice) ||
		math.IsInf(request.PromotionalPrice, 0) ||
		request.PromotionalPrice < 0 ||
		math.Abs(request.PromotionalPrice*100-math.Round(request.PromotionalPrice*100)) > 0.00001 {

		return ErrPromotionInvalid
	}

	// Recupera o preço original e verifica
	// se o produto possui variantes.
	price, variants, err := service.Store.ProductPromotionInfo(
		ctx,
		request.ProductID,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return ErrPromotionInvalid
	}
	if err != nil {
		return errors.Join(ErrPromotionLookup, err)
	}

	// Impede descontos em produtos com variantes
	// e exige preço inferior ao original.
	if variants || request.PromotionalPrice >= price {
		return ErrPromotionInvalid
	}

	// Localiza a campanha ativa pelo nome.
	id, err := service.Store.FindActiveID(
		ctx,
		request.PromotionName,
	)

	if errors.Is(err, sql.ErrNoRows) {
		return ErrPromotionNotFound
	}

	if err != nil {
		return errors.Join(ErrPromotionLookup, err)
	}

	// Vincula o produto à campanha.
	err = service.Store.AddProduct(ctx, id, request)
	if errors.Is(err, repositories.ErrCampaignInvalid) {
		return ErrPromotionInvalid
	}
	if errors.Is(err, sql.ErrNoRows) {
		return ErrPromotionNotFound
	}
	return err
}
