package models

import "time"

type OrderFilters struct {
	Search        string
	CancelledOnly bool
	Oldest        bool
	From, Until   *time.Time
}

type OrderHistoryEntry struct {
	CheckoutOrder
	CreatedAt time.Time          `json:"createdAt"`
	Items     []OrderHistoryItem `json:"items"`
}

type CancellationReason struct {
	ReasonCode    string `json:"reasonCode"`
	ReasonDetails string `json:"reasonDetails,omitempty"`
}

type OrderDetails struct {
	Cancellation *CancellationReason `json:"cancellation,omitempty"`
	OrderHistoryEntry
	Address                 ShippingAddress `json:"address"`
	PaymentMethod           string          `json:"paymentMethod"`
	CanCancel               bool            `json:"canCancel"`
	CancellationRemainingMs int64           `json:"cancellationRemainingMs"`
}

type OrderHistoryItem struct {
	ProductID int64  `json:"productId,omitempty"`
	UnitPrice Money  `json:"unitPrice"`
	Subtotal  Money  `json:"subtotal"`
	ID        int64  `json:"id"`
	Name      string `json:"name"`
	Quantity  int64  `json:"quantity"`
	Image     string `json:"image"`
}
