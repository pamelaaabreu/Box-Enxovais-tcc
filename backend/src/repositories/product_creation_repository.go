package repositories

import (
	"backend/src/models"
	"context"
	"encoding/json"
	"strings"
)

// Cadastra um produto e suas variantes dentro da mesma transação.
func (repo ProductRepository) Create(ctx context.Context, p models.Product) (int, error) {

	// Converte as características do produto para JSON.
	measurementsJSON, err := json.Marshal(p.Measurements)
	if err != nil {
		return 0, err
	}

	// Consulta responsável por cadastrar o produto
	// e recuperar o ID gerado pelo banco.
	query := `
INSERT INTO products(name, description, care_instructions, measurements, price, quantity, brand_id, product_type_id,
status, purchase_summary, sku)
VALUES ($1,
$2,
$3,
$4,
$5,
$6,
$7,
$8,
$9,
$10,
$11)
RETURNING id
`

	var productID int

	// Inicia a transação para garantir que o produto
	// e suas variantes sejam cadastrados juntos.
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return 0, err
	}

	defer tx.Rollback()

	// Cadastra o produto e armazena seu ID.
	err = tx.QueryRowContext(ctx,
		query,
		p.Name,
		p.Description,
		p.CareInstructions,
		measurementsJSON,
		p.Price,
		p.Quantity,
		p.BrandID,
		p.ProductTypeID,
		p.Status,
		p.PurchaseSummary,
		p.SKU,
	).Scan(&productID)

	if err != nil {
		return 0, err
	}

	// Percorre as variantes informadas e cadastra cada uma,
	// relacionando-as ao produto recém-criado.
	for _, v := range p.Variants {
		if v.IncludedItems == nil {
			v.IncludedItems = []string{}
		}
		included, marshalErr := json.Marshal(v.IncludedItems)
		if marshalErr != nil {
			return 0, marshalErr
		}
		if _, err = tx.ExecContext(ctx, `
INSERT INTO product_variants(product_id, size, price, quantity, dimensions, included_items, simulated)
VALUES ($1,
$2,
$3,
$4,
$5,
$6,
$7)
`,
			productID,
			strings.TrimSpace(v.Size),
			v.Price,
			v.Stock,
			strings.TrimSpace(v.Dimensions),
			string(included),
			v.Simulated,
		); err != nil {
			return 0, err
		}
	}

	// Confirma o cadastro do produto e de todas as variantes.
	err = tx.Commit()

	return productID, err
}
