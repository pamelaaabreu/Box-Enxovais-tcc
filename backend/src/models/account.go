package models

type AccountProfile struct {
	Name  string `json:"name"`
	Email string `json:"email"`
	Phone string `json:"phone"`
}

type UserAddress struct {
	ShippingAddress
	ID        int64  `json:"id"`
	Label     string `json:"label"`
	IsDefault bool   `json:"isDefault"`
}
