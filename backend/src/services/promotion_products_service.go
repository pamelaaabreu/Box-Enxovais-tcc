package services

import (
	"backend/src/models"
	"context"
	"database/sql"
	"errors"
	"math"
)

func (service PromotionService) AddProduct(ctx context.Context, request models.AddToPromotionRequest) error {
	if request.ProductID <= 0 || math.IsNaN(request.PromotionalPrice) || math.IsInf(request.PromotionalPrice, 0) || request.PromotionalPrice < 0 || math.Abs(request.PromotionalPrice*100-math.Round(request.PromotionalPrice*100)) > 0.00001 {
		return ErrPromotionInvalid
	}
	price, variants, err := service.Store.ProductPromotionInfo(ctx, request.ProductID)
	if err != nil {
		return ErrPromotionInvalid
	}
	if variants || request.PromotionalPrice >= price {
		return ErrPromotionInvalid
	}
	id, err := service.Store.FindActiveID(ctx, request.PromotionName)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrPromotionNotFound
	}
	if err != nil {
		return errors.Join(ErrPromotionLookup, err)
	}
	return service.Store.AddProduct(ctx, id, request)
}
