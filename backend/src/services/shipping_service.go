package services

import (
	"math"
	"strings"
	"unicode/utf8"

	"backend/src/models"
	"backend/src/repositories"
)

func ValidateShippingRange(
	item *models.ShippingRange,
) (int, int, bool) {

	if item == nil {
		return 0, 0, false
	}

	// Converte e valida os CEPs inicial e final.
	startCEP, startOK := repositories.ParseShippingCEP(item.StartCEP)
	endCEP, endOK := repositories.ParseShippingCEP(item.EndCEP)

	// Remove espaços das extremidades do nome.
	item.Name = strings.TrimSpace(item.Name)

	// Valida todas as informações da faixa de entrega.
	valid := startOK &&
		endOK &&
		startCEP <= endCEP &&
		item.Name != "" &&
		utf8.RuneCountInString(item.Name) <= 100 &&
		item.PriceCents != nil &&
		*item.PriceCents >= 0 &&
		*item.PriceCents <= math.MaxInt32 &&
		item.MinDays != nil &&
		item.MaxDays != nil &&
		*item.MinDays >= 0 &&
		*item.MinDays <= *item.MaxDays &&
		*item.MaxDays <= math.MaxInt32 &&
		item.Active != nil

	return startCEP, endCEP, valid
}
