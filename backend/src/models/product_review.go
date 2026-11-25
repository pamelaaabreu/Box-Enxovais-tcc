package models

import "time"

type ProductReview struct {
	ID           int64     `json:"id"`
	ProductID    int64     `json:"productId"`
	ProductName  string    `json:"productName"`
	ImagePath    string    `json:"imagePath"`
	OrderID      int64     `json:"orderId,omitempty"`
	Rating       int       `json:"rating"`
	Comment      string    `json:"comment"`
	Consent      bool      `json:"publicationConsent"`
	Status       string    `json:"status,omitempty"`
	CreatedAt    time.Time `json:"createdAt"`
	UpdatedAt    time.Time `json:"updatedAt"`
	CustomerName string    `json:"customerName,omitempty"`
	CanEdit      bool      `json:"canEdit,omitempty"`
}

// DTO de entrada para criação e edição de avaliações
type ProductReviewInput struct {
	Rating  int    `json:"rating"`
	Comment string `json:"comment"`
	Consent bool   `json:"publicationConsent"`
}

// representa um produto elegível para avaliação pelo cliente
type ReviewableProduct struct {
	ProductID   int64  `json:"productId"`
	ProductName string `json:"productName"`
	ImagePath   string `json:"imagePath"`
}
type ProductReviewSummary struct {
	Average float64 `json:"average"`
	Count   int     `json:"count"`
}
