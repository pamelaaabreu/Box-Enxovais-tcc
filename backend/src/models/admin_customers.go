package models

import "time"

type AdminCustomer struct {
	ID              int        `json:"id"`
	Name            string     `json:"name"`
	Email           string     `json:"email"`
	Phone           string     `json:"phone"`
	CreatedAt       *time.Time `json:"createdAt"`
	Orders          int        `json:"orders"`
	ValidOrders     int        `json:"validOrders"`
	CancelledOrders int        `json:"cancelledOrders"`
	TotalSpent      Money      `json:"totalSpent"`
	LastPurchase    *time.Time `json:"lastPurchase"`
}
type AdminCustomerPage struct {
	Customers     []AdminCustomer `json:"customers"`
	Total         int             `json:"total"`
	WithOrders    int             `json:"withOrders"`
	WithoutOrders int             `json:"withoutOrders"`
}
type AdminCustomerDetails struct {
	AdminCustomer
	Addresses []UserAddress `json:"addresses"`
}
