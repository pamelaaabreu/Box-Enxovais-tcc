package models

import "time"

type ProductType struct {
	ID   int    `json:"id"`
	Name string `json:"name"`
}

type ProductVariant struct {
	ID            int64    `json:"id"`
	Size          string   `json:"size"`
	Price         float64  `json:"price"`
	Stock         int      `json:"stock"`
	Dimensions    string   `json:"dimensions,omitempty"`
	ImagePaths    []string `json:"image_paths,omitempty"`
	IncludedItems []string `json:"included_items,omitempty"`
	Simulated     bool     `json:"simulated,omitempty"`
}
type Product struct {
	SKU              string            `json:"sku"`
	Variants         []ProductVariant  `json:"variants,omitempty"`
	Stock            int               `json:"stock"`
	CategoryName     string            `json:"category_name,omitempty"`
	ID               int64             `json:"id"`
	Name             string            `json:"name"`
	PurchaseSummary  *string           `json:"purchase_summary,omitempty"`
	BrandName        string            `json:"brand_name,omitempty"`
	Description      *string           `json:"description,omitempty"`
	CareInstructions *string           `json:"care_instructions,omitempty"`
	Measurements     map[string]string `json:"measurements,omitempty"`
	Price            float64           `json:"price"`
	Quantity         int               `json:"quantity"`
	BrandID          *int              `json:"brand_id,omitempty"`
	ProductTypeID    *int              `json:"product_type_id,omitempty"`
	Status           string            `json:"status"`
	CreatedAt        time.Time         `json:"created_at"`
	UpdatedAt        time.Time         `json:"updated_at"`
	ImagePaths       []string          `json:"image_paths,omitempty"`
	PromotionalPrice float64           `json:"promotional_price"`
	PromotionActive  bool              `json:"promotion_active,omitempty"`
}

type PromotionParticipant struct {
	ProductID        int      `json:"product_id"`
	PromotionalPrice *float64 `json:"promotional_price"`
}

type PromotionRecord struct {
	CreatedAt *time.Time `json:"created_at,omitempty"`
	UpdatedAt *time.Time `json:"updated_at,omitempty"`
	ID        int        `json:"id"`
	CreatePromotionRequest
}

type CreatePromotionRequest struct {
	Products     *[]PromotionParticipant `json:"products,omitempty"`
	Description  string                  `json:"description"`
	ImagePath    string                  `json:"image_path"`
	HomeFeatured bool                    `json:"home_featured"`
	Name         string                  `json:"name"`
	Status       string                  `json:"status"`
	StartDate    string                  `json:"start_date"`
	EndDate      string                  `json:"end_date"`
}

type AddToPromotionRequest struct {
	ProductID        int     `json:"product_id"`
	PromotionName    string  `json:"promotion_name"`
	PromotionalPrice float64 `json:"promotional_price"`
}

type ProductCommerceChange struct {
	Price            float64 `json:"price"`
	Quantity         int     `json:"quantity"`
	ExpectedPrice    float64 `json:"expected_price"`
	ExpectedQuantity int     `json:"expected_quantity"`
}
