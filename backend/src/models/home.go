package models

import "time"

type HomeCampaign struct {
	ID          int               `json:"id"`
	Name        string            `json:"name"`
	Description string            `json:"description"`
	ImagePath   string            `json:"imagePath"`
	StartDate   time.Time         `json:"startDate"`
	EndDate     time.Time         `json:"endDate"`
	Products    []CampaignProduct `json:"products"`
}

type CampaignProduct struct {
	Product
}
