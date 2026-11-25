package models

type Dashboard struct {
	Orders              int64               `json:"orders"`
	ApprovedOrders      int64               `json:"approvedOrders"`
	CancelledOrders     int64               `json:"cancelledOrders"`
	ShippingCents       int64               `json:"shippingCents"`
	RevenueCents        int64               `json:"revenueCents"`
	AverageTicketCents  int64               `json:"averageTicketCents"`
	Products            int64               `json:"products"`
	ActiveProducts      int64               `json:"activeProducts"`
	LowStock            int64               `json:"lowStock"`
	OutOfStock          int64               `json:"outOfStock"`
	Customers           int64               `json:"customers"`
	NewCustomers        int64               `json:"newCustomers"`
	CustomersWithOrders int64               `json:"customersWithOrders"`
	Months              []DashboardMonth    `json:"months"`
	Categories          []DashboardCategory `json:"categories"`
	Series              []DashboardPoint    `json:"series"`
	TopProducts         []DashboardProduct  `json:"topProducts"`
	Stock               []DashboardStock    `json:"stock"`
	RecentOrders        []DashboardOrder    `json:"recentOrders"`
	Period              DashboardPeriod     `json:"period"`
}

// Tipos fixos dos gráficos; valores monetários permanecem em centavos.
type DashboardMonth struct {
	Month     string `json:"month"`
	Total     int64  `json:"total"`
	Cancelled int64  `json:"cancelled"`
}
type DashboardCategory struct {
	Name  string `json:"name"`
	Units int64  `json:"units"`
}
type DashboardPoint struct {
	Bucket       string `json:"bucket"`
	Orders       int64  `json:"orders"`
	Approved     int64  `json:"approved"`
	Cancelled    int64  `json:"cancelled"`
	RevenueCents int64  `json:"revenueCents"`
	Customers    int64  `json:"customers"`
}
type DashboardProduct struct {
	ProductID    *int64 `json:"productId"`
	Name         string `json:"name"`
	Units        int64  `json:"units"`
	RevenueCents int64  `json:"revenueCents"`
	Archived     bool   `json:"archived"`
}
type DashboardStock struct {
	ProductID     int64  `json:"productId"`
	VariantID     int64  `json:"variantId"`
	Name          string `json:"name"`
	Size          string `json:"size"`
	Quantity      int64  `json:"quantity"`
	TotalQuantity int64  `json:"totalQuantity"`
}
type DashboardOrder struct {
	ID       int64  `json:"id"`
	Customer string `json:"customer"`
	// Mantém o timestamp textual emitido pelo PostgreSQL, sem mudar o contrato.
	CreatedAt  string `json:"createdAt"`
	TotalCents int64  `json:"totalCents"`
	Status     string `json:"status"`
}
