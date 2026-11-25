package models

import "time"

type ExperienceReview struct {
	CanEdit    bool      `json:"canEdit"`
	Topics     []string  `json:"topics"`
	ID         int64     `json:"id"`
	OrderID    int64     `json:"orderId,omitempty"`
	Overall    int       `json:"overall"`
	Navigation *int      `json:"navigation"`
	Service    *int      `json:"service"`
	Experience *int      `json:"experience"`
	Comment    string    `json:"comment"`
	Consent    bool      `json:"publicationConsent"`
	Status     string    `json:"status,omitempty"`
	CreatedAt  time.Time `json:"createdAt"`
}
