package models

import "time"

// DTO p/ receber atualização do produto
type ProductUpdateRequest struct {
	Name              string                 `json:"name"`
	Description       string                 `json:"description"`
	CareInstructions  string                 `json:"care_instructions"`
	BrandID           *int                   `json:"brand_id"`
	ProductTypeID     int                    `json:"product_type_id"`
	Status            string                 `json:"status"`
	Measurements      map[string]string      `json:"measurements"`
	Variants          []ProductVariant       `json:"variants"`
	ExpectedVariants  []ProductVariant       `json:"expected_variants"`
	Commerce          *ProductCommerceChange `json:"commerce,omitempty"`
	ExpectedUpdatedAt time.Time              `json:"expected_updated_at"`
}

type ProductImage struct {
	ID   int64  `json:"id"`
	Path string `json:"path"`
	// identificador opcional da variante, quando nil, a imagem não pertence a uma variante específica.
	VariantID *int64 `json:"variant_id"`
	Primary   bool   `json:"is_primary"`
	Position  int    `json:"position"`
}

type ProductImageOrder struct {
	VariantID *int64  `json:"variant_id"`
	IDs       []int64 `json:"ids"`
	// identificadores na ordem anterior esperada, permitindo detectar alterações concorrentes.
	ExpectedIDs []int64 `json:"expected_ids"`
	PrimaryID   int64   `json:"primary_id"`
}
