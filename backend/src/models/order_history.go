package models

import "time"

type OrderFilters struct {
	Oldest      bool
	From, Until *time.Time
}

type OrderHistoryEntry struct {
	CheckoutOrder
	CreatedAt time.Time          `json:"createdAt"`
	Items     []OrderHistoryItem `json:"items"`
}

type OrderDetails struct {
	OrderHistoryEntry
	Address       ShippingAddress `json:"address"`
	PaymentMethod string          `json:"paymentMethod"`
}

type OrderHistoryItem struct {
	UnitPrice Money  `json:"unitPrice"`
	Subtotal  Money  `json:"subtotal"`
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Quantity  int64  `json:"quantity"`
	Image     string `json:"image"`
}
