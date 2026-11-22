package services

import (
	"backend/src/models"
	"errors"
	"strings"
	"unicode/utf8"
)

func ValidateExperienceReview(review *models.ExperienceReview) error {
	review.Comment = strings.TrimSpace(review.Comment)
	if review.Overall < 1 || review.Overall > 5 {
		return errors.New("Selecione uma nota de 1 a 5 para sua experiência de compra.")
	}
	for _, rating := range []*int{review.Navigation, review.Service, review.Experience} {
		if rating != nil && (*rating < 1 || *rating > 5) {
			return errors.New("Selecione uma nota de 1 a 5 nos critérios informados.")
		}
	}
	if utf8.RuneCountInString(review.Comment) > 1000 || strings.ContainsRune(review.Comment, 0) {
		return errors.New("O comentário deve ter até 1000 caracteres válidos.")
	}
	return nil
}
