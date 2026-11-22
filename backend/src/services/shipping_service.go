package services

import (
	"backend/src/models"
	"backend/src/repositories"
	"strings"
	"unicode/utf8"
)

func ValidateShippingRange(item *models.ShippingRange) (int, int, bool) {
	startCEP, startOK := repositories.ParseShippingCEP(item.StartCEP)
	endCEP, endOK := repositories.ParseShippingCEP(item.EndCEP)
	item.Name = strings.TrimSpace(item.Name)
	valid := startOK && endOK && startCEP <= endCEP && item.Name != "" && utf8.RuneCountInString(item.Name) <= 100 &&
		item.PriceCents != nil && *item.PriceCents >= 0 && *item.PriceCents <= 2147483647 &&
		item.MinDays != nil && item.MaxDays != nil && *item.MinDays >= 0 && *item.MinDays <= *item.MaxDays && *item.MaxDays <= 2147483647 && item.Active != nil
	return startCEP, endCEP, valid
}
