package models

const (
	OrderStatusApproved    = "simulated_approved"
	OrderStatusCancelled   = "cancelled"
	ShippingMethodDelivery = "delivery"
)

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

// DTO p/ finalizar a compra
type CheckoutRequest struct {
	AddressID          int64           `json:"addressId"`
	SaveAddress        bool            `json:"saveAddress"`
	ContactPhone       string          `json:"contactPhone"`
	RequestKey         string          `json:"requestKey"` // evita que uma solicitação seja processada mais de uma vez.
	Address            ShippingAddress `json:"address"`
	PaymentMethod      string          `json:"paymentMethod"`
	Installments       *int            `json:"installments"`
	ExpectedTotalCents int64           `json:"expectedTotalCents"` // valor que o cliente paga, evitando divergência de valor.
}

type OrderCharges struct {
	Shipping         *Money  `json:"shipping"`
	ShippingMinDays  *int    `json:"shippingMinDays"`
	ShippingMaxDays  *int    `json:"shippingMaxDays"`
	ShippingMethod   *string `json:"shippingMethod"`
	ProductsSubtotal *Money  `json:"productsSubtotal"`
	Discount         *Money  `json:"discount"`
}

type CheckoutOrder struct {
	PaymentPlan
	OrderCharges
	ReceiptItems []CartItem `json:"-"`
	ID           int64      `json:"id"`
	Total        Money      `json:"total"`
	Status       string     `json:"status"`
}
