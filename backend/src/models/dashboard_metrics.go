package models

import "encoding/json"

type Dashboard struct {
	Orders              int64           `json:"orders"`
	ApprovedOrders      int64           `json:"approvedOrders"`
	CancelledOrders     int64           `json:"cancelledOrders"`
	ShippingCents       int64           `json:"shippingCents"`
	RevenueCents        int64           `json:"revenueCents"`
	AverageTicketCents  int64           `json:"averageTicketCents"`
	Products            int64           `json:"products"`
	ActiveProducts      int64           `json:"activeProducts"`
	LowStock            int64           `json:"lowStock"`
	OutOfStock          int64           `json:"outOfStock"`
	Customers           int64           `json:"customers"`
	NewCustomers        int64           `json:"newCustomers"`
	CustomersWithOrders int64           `json:"customersWithOrders"`
	Months              json.RawMessage `json:"months"`
	Categories          json.RawMessage `json:"categories"`
	Series              json.RawMessage `json:"series"`
	TopProducts         json.RawMessage `json:"topProducts"`
	Stock               json.RawMessage `json:"stock"`
	RecentOrders        json.RawMessage `json:"recentOrders"`
	Period              DashboardPeriod `json:"period"`
}
