package models

import "time"

// Representa os dados resumidos de um pedido p/ a listagem administrativa.
type AdminOrder struct {
	ID            int64     `json:"id"`
	CustomerID    int       `json:"customerId"`
	Customer      string    `json:"customer"`
	CreatedAt     time.Time `json:"createdAt"`
	Total         Money     `json:"total"`
	Status        string    `json:"status"`
	PaymentMethod string    `json:"paymentMethod"`
}

// Representa a listagem de pedidos e seus totalizadores.
type AdminOrderPage struct {
	Orders    []AdminOrder `json:"orders"`
	Total     int          `json:"total"`
	Approved  int          `json:"approved"`
	Cancelled int          `json:"cancelled"`
}

type AdminOrderItem struct {
	OrderHistoryItem
	SKU       string `json:"sku,omitempty"`
	VariantID int64  `json:"variantId,omitempty"`
}

type AdminOrderEvent struct {
	Kind   string    `json:"kind"`
	At     time.Time `json:"at"`
	Reason string    `json:"reason,omitempty"`
}

// Representa os detalhes completos de um pedido para o gerenciamento administrativo.
type AdminOrderDetails struct {
	PaymentPlan
	OrderCharges
	AdminOrder
	Items     []AdminOrderItem  `json:"items"`
	Address   ShippingAddress   `json:"address"`
	Subtotal  Money             `json:"subtotal"`
	CanCancel bool              `json:"canCancel"`
	Events    []AdminOrderEvent `json:"events"`
}
