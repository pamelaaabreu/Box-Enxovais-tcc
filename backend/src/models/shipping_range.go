package models

// config. das faixas de cep
type ShippingRange struct {
	ID         int64  `json:"id"`
	Name       string `json:"name"`
	StartCEP   string `json:"startCep"`
	EndCEP     string `json:"endCep"`
	PriceCents *int   `json:"priceCents"`
	MinDays    *int   `json:"minDays"`
	MaxDays    *int   `json:"maxDays"`
	Active     *bool  `json:"active"`
}
