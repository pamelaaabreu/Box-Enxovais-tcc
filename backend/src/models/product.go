package models

import "time"

type Product struct {
	Stock            int               `json:"stock"`
	CategoryName     string            `json:"category_name,omitempty"`
	ID               int64             `json:"id"`
	Name             string            `json:"name"`
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
	PromotionalPrice float64           `json:"promotional_price,omitempty"`
}

type CreatePromotionRequest struct {
	Name      string `json:"name"`
	Status    string `json:"status"`
	StartDate string `json:"start_date"`
	EndDate   string `json:"end_date"`
}

type AddToPromotionRequest struct {
	ProductID        int     `json:"product_id"`
	PromotionName    string  `json:"promotion_name"`
	PromotionalPrice float64 `json:"promotional_price"`
}
