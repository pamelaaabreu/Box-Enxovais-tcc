package models

type AccountProfilePatch struct {
	Name       *string `json:"name"`
	Phone      *string `json:"phone"`
	NationalID *string `json:"nationalId"`
	BirthDate  *string `json:"birthDate"`
}

type AccountProfile struct {
	NationalID string `json:"nationalId"`
	BirthDate  string `json:"birthDate"`
	Name       string `json:"name"`
	Email      string `json:"email"`
	Phone      string `json:"phone"`
}

type UserAddress struct {
	ShippingAddress
	ID        int64  `json:"id"`
	Label     string `json:"label"`
	IsDefault bool   `json:"isDefault"`
}
