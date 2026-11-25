package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"errors"
)

var ErrOrderNotCancellable = errors.New("Este pedido não está disponível para cancelamento")
var ErrOrderRestock = errors.New("Não foi possível repor o estoque deste pedido. Entre em contato com o suporte.")
var ErrOrderForbidden = errors.New("Você não tem permissão para cancelar este pedido")

type cancellationActor struct {
	UserID         int
	Administrative bool
}
type lockedCancellationOrder struct {
	OwnerID      int
	Status       string
	StockDebited bool
}

func (repo CheckoutRepository) CancelOrder(ctx context.Context, userID int, orderID int64, reason models.CancellationReason) (models.OrderDetails, bool, error) {
	return repo.cancelOrder(ctx, cancellationActor{UserID: userID}, orderID, reason)
}
func (repo CheckoutRepository) CancelAdminOrder(ctx context.Context, actorID int, orderID int64, reason models.CancellationReason) (models.OrderDetails, bool, error) {
	return repo.cancelOrder(ctx, cancellationActor{UserID: actorID, Administrative: true}, orderID, reason)
}
func lockCancellationOrder(ctx context.Context, tx *sql.Tx, actor cancellationActor, orderID int64) (lockedCancellationOrder, error) {
	var order lockedCancellationOrder
	if actor.UserID <= 0 {
		return order, ErrOrderForbidden
	}
	where := "id=$1"
	args := []any{orderID}
	if actor.Administrative {
		// Confere o papel atual no banco, inclusive para token administrativo antigo/revogado.
		var authorized bool
		if err := tx.QueryRowContext(ctx, `SELECT EXISTS(SELECT 1 FROM users WHERE id=$1 AND role='admin')`, actor.UserID).Scan(&authorized); err != nil {
			return order, err
		}
		if !authorized {
			return order, ErrOrderForbidden
		}
	} else {
		where += " AND user_id=$2"
		args = append(args, actor.UserID)
	}
	err := tx.QueryRowContext(ctx, `SELECT user_id,status,stock_debited FROM checkout_orders WHERE `+where+` FOR UPDATE`, args...).Scan(&order.OwnerID, &order.Status, &order.StockDebited)
	return order, err
}
func (repo CheckoutRepository) cancelOrder(ctx context.Context, actor cancellationActor, orderID int64, reason models.CancellationReason) (models.OrderDetails, bool, error) {
	var details models.OrderDetails
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return details, false, err
	}
	defer tx.Rollback()
	locked, err := lockCancellationOrder(ctx, tx, actor, orderID)
	if err != nil {
		return details, false, err
	}
	changed := locked.Status != models.OrderStatusCancelled
	if changed {
		// stock_debited é histórico; o status impede devolver o mesmo estoque duas vezes.
		if locked.Status != models.OrderStatusApproved || !locked.StockDebited {
			return details, false, ErrOrderNotCancellable
		}
		if err = recordCancellation(ctx, tx, orderID, actor.UserID, reason); err != nil {
			return details, false, err
		}
		if err = restoreOrderStock(ctx, tx, orderID); err != nil {
			return details, false, err
		}
		result, err := tx.ExecContext(ctx, `UPDATE checkout_orders SET status=$1 WHERE id=$2 AND user_id=$3`, models.OrderStatusCancelled, orderID, locked.OwnerID)
		if err != nil {
			return details, false, err
		}
		if err = requireOneRow(result); err != nil {
			return details, false, err
		}
	}
	details, err = readOrderDetails(ctx, tx, locked.OwnerID, orderID)
	if err != nil {
		return details, false, err
	}
	if err = tx.Commit(); err != nil {
		return details, false, err
	}
	return details, changed, nil
}
func recordCancellation(ctx context.Context, tx *sql.Tx, orderID int64, actorID int, reason models.CancellationReason) error {
	result, err := tx.ExecContext(ctx, `
INSERT INTO order_cancellations(order_id, reason_code, reason_details, cancelled_by)
VALUES ($1,
$2,
NULLIF($3, ''),
$4)
`, orderID, reason.ReasonCode, reason.ReasonDetails, actorID)
	if err != nil {
		return err
	}
	return requireOneRow(result)
}
