package models

type ReportFilter struct {
	Kind, Search, Status, Sort string
	Page, PageSize             int
	Period                     DashboardPeriod
}
type ReportRow struct {
	ID                    int64   `json:"id"`
	Name                  string  `json:"name"`
	SKU                   string  `json:"sku"`
	Category              string  `json:"category"`
	Brand                 string  `json:"brand"`
	Variant               string  `json:"variant"`
	Email                 string  `json:"email"`
	CreatedAt             string  `json:"createdAt"`
	LastPurchase          string  `json:"lastPurchase"`
	Payment               string  `json:"payment"`
	Status                string  `json:"status"`
	Units                 int64   `json:"units"`
	Orders                int64   `json:"orders"`
	RevenueCents          int64   `json:"revenueCents"`
	ShippingCents         *int64  `json:"shippingCents"`
	DiscountCents         *int64  `json:"discountCents"`
	ProductsSubtotalCents *int64  `json:"productsSubtotalCents"`
	Share                 float64 `json:"share"`
	Archived              bool    `json:"archived"`
}
type Report struct {
	Rows     []ReportRow      `json:"rows"`
	Total    int64            `json:"total"`
	Stats    map[string]int64 `json:"stats"`
	Page     int              `json:"page"`
	PageSize int              `json:"pageSize"`
	Period   DashboardPeriod  `json:"period"`
}
