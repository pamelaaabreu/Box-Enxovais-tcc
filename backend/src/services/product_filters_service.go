package services

import (
	"backend/src/pagination"
	"backend/src/repositories"
	"fmt"
	"net/url"
)

var productFilterFields = map[string]pagination.FilterField{
	"material":          {Column: "page.measurements->>'Material'", Kind: "text"},
	"opacity":           {Column: "page.measurements->>'Opacidade'", Kind: "text"},
	"id":                {Column: "page.id", Kind: "integer"},
	"name":              {Column: "page.name", Kind: "text"},
	"sku":               {Column: "page.sku", Kind: "text"},
	"search":            {Column: "(page.name || ' ' || page.sku)", Kind: "text"},
	"description":       {Column: "page.description", Kind: "text"},
	"care_instructions": {Column: "page.care_instructions", Kind: "text"},
	"price":             {Column: "page.price", Kind: "decimal"},
	"quantity":          {Column: "page.quantity", Kind: "integer"},
	"stock":             {Column: "page.quantity", Kind: "integer"},
	"status":            {Column: "page.status", Kind: "text"},
	"brand_id":          {Column: "page.brand_id", Kind: "integer"},
	"product_type_ids":  {Column: "page.product_type_id", Kind: "integer_list"},
	"product_type_id":   {Column: "page.product_type_id", Kind: "integer"},
	"collection":        {Column: "COALESCE(NULLIF(page.measurements->>'collection_slug',''),page.measurements->>'Coleção')", Kind: "text"},
	"color":             {Column: "page.measurements->>'Cor'", Kind: "text"},
	"size":              {Column: "page.measurements->>'Tamanho'", Kind: "text"},
	"type":              {Column: "page.measurements->>'Tipo'", Kind: "text"},
	"pattern":           {Column: "page.measurements->>'Estampa'", Kind: "text"},
	"category_name":     {Column: "page.category_name", Kind: "text"},
	"created_at":        {Column: "page.created_at", Kind: "timestamp"},
	"updated_at":        {Column: "page.updated_at", Kind: "timestamp"},
}

func (service ProductService) ParsePage(values url.Values, promotional bool) (pagination.PageQuery, error) {
	fields := productFilterFields
	firstParameter := 1
	if promotional {
		fields = make(map[string]pagination.FilterField, len(productFilterFields)+1)
		for key, field := range productFilterFields {
			fields[key] = field
		}
		fields["promotional_price"] = pagination.FilterField{Column: "page.promotional_price", Kind: "decimal"}
		firstParameter = 2
	}
	order := ""
	if entries, exists := values["sort"]; exists && !promotional {
		if len(entries) != 1 {
			return pagination.PageQuery{}, fmt.Errorf("Ordenação inválida")
		}
		orders := map[string]string{
			"price_asc":  "page.price ASC, page.id",
			"price_desc": "page.price DESC, page.id",
			"name":       "lower(page.name), page.id",
			"recent":     "page.created_at DESC NULLS LAST, page.id DESC",
		}
		order = orders[entries[0]]
		if order == "" {
			return pagination.PageQuery{}, fmt.Errorf("Ordenação inválida")
		}
		values.Del("sort")
	}
	query, err := pagination.ParsePage(values, fields, firstParameter)
	if order == "" && !promotional && (values.Has("collection") || values.Has("collection__eq")) {
		order = repositories.CatalogCoordinatedOrder
	}
	query.Order = order
	return query, err
}
