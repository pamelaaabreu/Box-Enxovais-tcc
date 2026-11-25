package repositories

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
)

var ErrCartOrderNotFound = errors.New("Pedido não encontrado")

// adiciona ao carrinho os produtos de um pedido anterior.
func reorderItems(ctx context.Context, tx *sql.Tx, userID int, cartID, orderID int64) error {

	// busca os produtos do pedido anterior.
	// agrupa produtos iguais com a mesma variante e soma suas qtd.
	rows, err := tx.QueryContext(ctx, `
SELECT
    i.product_id,
    COALESCE(i.variant_id, 0),
    SUM(i.quantity),
    MIN(i.name)
FROM checkout_order_items i
JOIN checkout_orders o ON o.id = i.order_id
WHERE o.id = $1
    AND o.user_id = $2
GROUP BY i.product_id,
    i.variant_id
ORDER BY i.product_id,
    i.variant_id
`, orderID, userID)

	if err != nil {
		return err
	}

	type item struct {
		id        int64
		variantID int64
		quantity  int64
		name      string
	}

	var items []item

	defer rows.Close()

	// percorre os resultados da consulta e armazena
	// os produtos na lista temporária.
	for rows.Next() {
		var line item

		if err := rows.Scan(
			&line.id,
			&line.variantID,
			&line.quantity,
			&line.name,
		); err != nil {
			return err
		}

		items = append(items, line)
	}

	if err := rows.Err(); err != nil {
		return err
	}

	// fecha os resultados antes de executar novas consultas
	// utilizando a mesma conexão da transação.
	if err := rows.Close(); err != nil {
		return err
	}

	if len(items) == 0 {
		return ErrCartOrderNotFound
	}

	// percorre os produtos do pedido anterior e adiciona
	// cada um ao carrinho atual.
	for _, line := range items {

		if err := writeCartItem(
			ctx,
			tx,
			cartID,
			CartAdd,
			cartItemChange{
				ProductID: line.id,
				VariantID: optionalVariant(line.variantID),
				Quantity:  line.quantity,
			},
		); err != nil {

			// caso um produto esteja indisponível ou não tenha
			// estoque suficiente, informa qual produto causou o erro.
			if errors.Is(err, ErrCartProduct) || errors.Is(err, ErrCartQuantity) {

				// o erro é retornado ao Apply(), que realiza o rollback,
				// desfazendo todas as inclusões desta recompra.
				return fmt.Errorf(
					"%s: %w. Nenhum produto foi adicionado.",
					line.name,
					err,
				)
			}

			return err
		}
	}

	return nil
}

// converte o ID da variante em um ponteiro opcional.
// se for 0, significa que o produto não possui variante
func optionalVariant(variantID int64) *int64 {
	if variantID == 0 {
		return nil
	}

	return &variantID
}
