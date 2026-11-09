package models

type ShippingAddress struct {
	Recipient    string `json:"recipient"`
	ZipCode      string `json:"zipCode"`
	Street       string `json:"street"`
	Number       string `json:"number"`
	Complement   string `json:"complement"`
	Neighborhood string `json:"neighborhood"`
	City         string `json:"city"`
	State        string `json:"state"`
}

type CheckoutRequest struct {
	AddressID          int64           `json:"addressId"`
	SaveAddress        bool            `json:"saveAddress"`
	ContactPhone       string          `json:"contactPhone"`
	RequestKey         string          `json:"requestKey"`
	Address            ShippingAddress `json:"address"`
	PaymentMethod      string          `json:"paymentMethod"`
	ExpectedTotalCents int64           `json:"expectedTotalCents"`
}

type CheckoutOrder struct {
	ReceiptItems []CartItem `json:"-"`
	ID           int64      `json:"id"`
	Total        Money      `json:"total"`
	Status       string     `json:"status"`
}
