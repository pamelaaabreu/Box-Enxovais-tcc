package services

import (
	"backend/src/models"
	"strings"
	"testing"
)

func TestValidateExperienceReview(t *testing.T) {
	invalidRating := 6
	cases := []struct {
		name    string
		review  models.ExperienceReview
		message string
	}{
		{"optional criteria absent", models.ExperienceReview{Overall: 5, Comment: "  Boa compra  "}, ""},
		{"overall required", models.ExperienceReview{}, "Selecione uma nota de 1 a 5 para sua experiência de compra."},
		{"criterion range", models.ExperienceReview{Overall: 5, Navigation: &invalidRating}, "Selecione uma nota de 1 a 5 nos critérios informados."},
		{"unicode limit", models.ExperienceReview{Overall: 1, Comment: strings.Repeat("á", 1000)}, ""},
		{"comment too long", models.ExperienceReview{Overall: 1, Comment: strings.Repeat("á", 1001)}, "O comentário deve ter até 1000 caracteres válidos."},
		{"null character", models.ExperienceReview{Overall: 1, Comment: "invalid\x00"}, "O comentário deve ter até 1000 caracteres válidos."},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			err := ValidateExperienceReview(&tc.review)
			if tc.message == "" {
				if err != nil {
					t.Fatal(err)
				}
			} else if err == nil || err.Error() != tc.message {
				t.Fatalf("error = %v, want %q", err, tc.message)
			}
			if tc.name == "optional criteria absent" && tc.review.Comment != "Boa compra" {
				t.Fatal("comment was not trimmed")
			}
		})
	}
}
