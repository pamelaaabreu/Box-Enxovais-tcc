package services

import (
	"context"
	"errors"

	"backend/src/models"
	"backend/src/repositories"
)

type ProductReviewService struct {
	Store repositories.ProductReviewRepository
}

func ValidateProductReview(input *models.ProductReviewInput) error {
	if !validRating(input.Rating) {
		return errors.New("Selecione uma nota de 1 a 5 para o produto.")
	}
	comment, err := normalizeReviewComment(input.Comment)
	if err != nil {
		return err
	}
	input.Comment = comment

	return nil
}

func (service ProductReviewService) Save(ctx context.Context, userID int, productID, reviewID int64, input models.ProductReviewInput) error {

	// Valida os dados antes da persistência.
	if err := ValidateProductReview(&input); err != nil {
		return ValidationError(err.Error())
	}

	return service.Store.Save(ctx, userID, productID, reviewID, input)
}
