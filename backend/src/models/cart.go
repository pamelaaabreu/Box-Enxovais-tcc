package models

type CartItem struct {
	VariantID int64  `json:"variantId,omitempty"`
	ID        int64  `json:"id"`
	ProductID int64  `json:"productId"`
	Name      string `json:"name"`
	Image     string `json:"image"`
	Quantity  int64  `json:"quantity"`
	Stock     int64  `json:"stock"`
	Available bool   `json:"available"`
	UnitPrice Money  `json:"unitPrice"`
	Subtotal  Money  `json:"subtotal"`
}
type Cart struct {
	Items      []CartItem `json:"items"`
	TotalItems int64      `json:"totalItems"`
	Total      Money      `json:"total"`
}
