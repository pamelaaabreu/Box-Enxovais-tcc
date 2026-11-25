package services

import (
	"backend/src/models"
	"strings"
	"testing"
)

func TestValidateProductReview(t *testing.T) {
	for _, rating := range []int{-1, 0, 6} {
		review := models.ProductReviewInput{Rating: rating}
		if ValidateProductReview(&review) == nil {
			t.Fatal("invalid rating accepted")
		}
	}
	for _, comment := range []string{strings.Repeat("á", 1001), "texto\x00inválido"} {
		review := models.ProductReviewInput{Rating: 5, Comment: comment}
		if ValidateProductReview(&review) == nil {
			t.Fatal("invalid comment accepted")
		}
	}
	review := models.ProductReviewInput{Rating: 4, Comment: "  Boa qualidade  "}
	if err := ValidateProductReview(&review); err != nil || review.Comment != "Boa qualidade" {
		t.Fatal("valid review rejected")
	}
}
