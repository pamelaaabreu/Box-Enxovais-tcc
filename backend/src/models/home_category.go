package models

// categoria dos produtos
type HomeCategory struct {
	Name      string `json:"name"`
	Slug      string `json:"slug"`
	ImagePath string `json:"imagePath"`
}
