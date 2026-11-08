package models

import "strconv"

// Money is always integer cents internally. JSON remains a decimal BRL number.
type Money int64

func (m Money) MarshalJSON() ([]byte, error) {
	return []byte(strconv.FormatInt(int64(m)/100, 10) + "." + leftPadCents(int64(m)%100)), nil
}
func leftPadCents(value int64) string {
	if value < 10 {
		return "0" + strconv.FormatInt(value, 10)
	}
	return strconv.FormatInt(value, 10)
}

type CartItem struct {
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
