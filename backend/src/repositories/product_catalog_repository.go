package repositories

import (
	"backend/src/models"
	"backend/src/pagination"
	"context"
)

// identifica a ordenação por coleções coordenadas.
const CatalogCoordinatedOrder = "coordinated"

// Organiza os produtos de uma mesma coleção próximos dos outros,
// bool_or verifica se existe pelo menos um produto do tipo informado.
// OVER (PARTITION BY) divide os produtos em grupos para realizar
// verificações sem juntar os registros em uma única linha.
// A ordenação segue estas prioridades:
// 1. Famílias que possuem jogo de cama e edredom.
// 2. Menor ID da família, mantendo produtos relacionados próximos.
// 3. Jogo de cama antes do edredom.
// 4. ID do produto como critério de desempate.
const collectionCoordinatedOrder = `
CASE WHEN NULLIF(page.measurements ->> 'coordinated_family', '') IS NOT NULL
    AND bool_or(page.measurements ->> 'coordinated_pair_type' = 'jogo-cama') OVER (PARTITION BY page.measurements ->> 'collection_slug',
page.measurements ->> 'coordinated_family')
    AND bool_or(page.measurements ->> 'coordinated_pair_type' = 'edredom') OVER (PARTITION BY page.measurements ->> 'collection_slug',
page.measurements ->> 'coordinated_family') THEN 0 ELSE 1 END,
CASE WHEN NULLIF(page.measurements ->> 'coordinated_family', '') IS NOT NULL THEN min(page.id) OVER (PARTITION BY page.measurements ->> 'collection_slug',
page.measurements ->> 'coordinated_family') ELSE page.id END,
CASE page.measurements ->> 'coordinated_pair_type' WHEN 'jogo-cama' THEN 0 WHEN 'edredom' THEN 1 ELSE 2 END,
page.id
`

func (repo ProductRepository) List(ctx context.Context, page pagination.PageQuery) (pagination.Page[models.Product], error) {
	order := page.Order

	// Caso seja solicitada a ordenação coordenada,
	// utiliza a expressão SQL definida anteriormente.
	if order == CatalogCoordinatedOrder {
		order = collectionCoordinatedOrder
	}

	// utiliza o ID do produto como padrão.
	if order == "" {
		order = "page.id"
	}

	query := `SELECT
` + storeProductColumns + "," + storePromotionalPrice + storeProductSource + `
WHERE p.status = 'active'`

	// Executa a consulta utilizando o helper de paginação.
	return pagination.ReadPage(ctx, repo.DB, query, nil, page, order, scanStoreProduct)
}

// Lista os produtos para o painel administrativo.
func (repo ProductRepository) ListAdmin(ctx context.Context, page pagination.PageQuery) (pagination.Page[models.Product], error) {

	query := `SELECT
` + storeProductColumns + "," + storePromotionalPrice + storeProductSource

	return pagination.ReadPage(ctx, repo.DB, query, nil, page, "page.id", scanStoreProduct)
}

// Lista os produtos vinculados a uma promoção específica.
func (repo ProductRepository) ListPromotional(ctx context.Context, name string, page pagination.PageQuery) (pagination.Page[models.Product], error) {
	// GROUP BY evita que o mesmo produto apareça duplicado.
	// MIN seleciona o menor preço promocional encontrado.
	//
	// Retorna somente produtos ativos cujo preço promocional
	// seja menor ou igual ao preço original.
	query := `SELECT
` + storeProductColumns + ",promotional.promotional_price" + storeProductSource + `
JOIN(SELECT pp.product_id, MIN(pp.promotional_price) AS promotional_price FROM promotion_products pp JOIN promotions promo ON promo.id = pp.promotion_id WHERE promo.name = $1 AND promo.status = 'active' AND promo.start_date <= NOW() AND promo.end_date >= NOW() AND pp.promotional_price >= 0 GROUP BY pp.product_id) promotional ON promotional.product_id = p.id
WHERE p.status = 'active'
    AND promotional.promotional_price <= p.price
`

	return pagination.ReadPage(ctx, repo.DB, query, []any{name}, page, "page.id", scanStoreProduct)
}
