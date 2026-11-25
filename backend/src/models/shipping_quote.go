package models

// cotação de frete p/ cliente
type ShippingQuote struct {
	PriceCents int `json:"priceCents"`
	MinDays    int `json:"minDays"`
	MaxDays    int `json:"maxDays"`
}
