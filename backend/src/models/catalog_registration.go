package models

type CatalogRegistration struct {
	ProductType
	ProductCount int64 `json:"productCount"`
}
