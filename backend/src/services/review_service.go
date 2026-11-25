package services

import (
	"errors"
	"strings"
	"unicode/utf8"

	"backend/src/models"
)

const maxReviewCommentCharacters = 1000

func validRating(rating int) bool { return rating >= 1 && rating <= 5 }
func normalizeReviewComment(comment string) (string, error) {
	comment = strings.TrimSpace(comment)
	if utf8.RuneCountInString(comment) > maxReviewCommentCharacters || strings.ContainsRune(comment, 0) {
		return "", errors.New("O comentário deve ter até 1000 caracteres válidos.")
	}
	return comment, nil
}
func ValidateExperienceReview(review *models.ExperienceReview) error {

	// Remove espaços das extremidades do comentário.
	review.Comment = strings.TrimSpace(review.Comment)

	// Valida a nota geral obrigatória.
	if !validRating(review.Overall) {
		return errors.New("Selecione uma nota de 1 a 5 para sua experiência de compra.")
	}

	// Percorre os critérios opcionais da avaliação.
	for _, rating := range []*int{
		review.Navigation,
		review.Service,
		review.Experience,
	} {

		// Valida somente os critérios preenchidos.
		if rating != nil && !validRating(*rating) {
			return errors.New("Selecione uma nota de 1 a 5 nos critérios informados.")
		}
	}

	comment, err := normalizeReviewComment(review.Comment)
	if err != nil {
		return err
	}
	review.Comment = comment

	return nil
}
