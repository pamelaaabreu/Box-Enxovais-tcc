package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
)

type AdminCustomerRepository struct{ DB *sql.DB }

const customerSummary = `
WITH purchases AS (
    SELECT
        user_id,
        count(*) AS orders,
        count(*) FILTER (
    WHERE status = 'simulated_approved') AS valid_orders,
    count(*) FILTER (
    WHERE status = 'cancelled') AS cancelled_orders,
    COALESCE(sum(total_cents) FILTER (
    WHERE status = 'simulated_approved'), 0) AS total_spent,
    max(created_at) FILTER (
    WHERE status = 'simulated_approved') AS last_purchase
    FROM checkout_orders
    GROUP BY user_id
)
`
const customerColumns = `    u.id,
    u.full_name,
    u.email,
    COALESCE(u.phone, ''),
    u.created_at,
    COALESCE(p.orders, 0),
    COALESCE(p.valid_orders, 0),
    COALESCE(p.cancelled_orders, 0),
    COALESCE(p.total_spent, 0),
    p.last_purchase`

func scanCustomer(row rowScanner) (models.AdminCustomer, error) {
	var customer models.AdminCustomer
	err := row.Scan(&customer.ID, &customer.Name, &customer.Email, &customer.Phone, &customer.CreatedAt, &customer.Orders, &customer.ValidOrders, &customer.CancelledOrders, &customer.TotalSpent, &customer.LastPurchase)
	return customer, err
}
func (repo AdminCustomerRepository) List(ctx context.Context, search string, limit int, offset int) (models.AdminCustomerPage, error) {
	page := models.AdminCustomerPage{Customers: []models.AdminCustomer{}}
	tx, err := repo.DB.BeginTx(ctx, &sql.TxOptions{ReadOnly: true, Isolation: sql.LevelRepeatableRead})
	if err != nil {
		return page, err
	}
	defer tx.Rollback()
	const where = `
FROM users u
LEFT JOIN purchases p ON p.user_id = u.id
WHERE u.role = 'customer'
    AND ($1 = ''
    OR u.full_name ILIKE '%' || $1 || '%'
    OR u.email ILIKE '%' || $1 || '%')
`
	err = tx.QueryRowContext(ctx, customerSummary+`
SELECT
    count(*),
    count(*) FILTER (
WHERE COALESCE(p.orders, 0) > 0),
count(*) FILTER (
WHERE COALESCE(p.orders, 0) = 0)
`+where, search).Scan(&page.Total, &page.WithOrders, &page.WithoutOrders)
	if err != nil {
		return page, err
	}
	rows, err := tx.QueryContext(ctx, customerSummary+`SELECT
`+customerColumns+where+`
ORDER BY u.created_at DESC NULLS LAST,
    u.id DESC
LIMIT $2
OFFSET $3
`, search, limit, offset)
	if err != nil {
		return page, err
	}
	for rows.Next() {
		customer, err := scanCustomer(rows)
		if err != nil {
			rows.Close()
			return page, err
		}
		page.Customers = append(page.Customers, customer)
	}
	err = rows.Err()
	rows.Close()
	if err != nil {
		return page, err
	}
	return page, tx.Commit()
}
func (repo AdminCustomerRepository) Detail(ctx context.Context, id int) (models.AdminCustomerDetails, error) {
	var result models.AdminCustomerDetails
	tx, err := repo.DB.BeginTx(ctx, &sql.TxOptions{ReadOnly: true, Isolation: sql.LevelRepeatableRead})
	if err != nil {
		return result, err
	}
	defer tx.Rollback()
	result.AdminCustomer, err = scanCustomer(tx.QueryRowContext(ctx, customerSummary+`SELECT
`+customerColumns+`
FROM users u
LEFT JOIN purchases p ON p.user_id = u.id
WHERE u.id = $1
    AND u.role = 'customer'
`, id))
	if err != nil {
		return result, err
	}
	result.Addresses, err = readAddresses(ctx, tx, id)
	if err != nil {
		return result, err
	}
	return result, tx.Commit()
}
func (repo AdminCustomerRepository) Orders(ctx context.Context, id int, limit int, offset int) (models.AdminOrderPage, error) {
	var customer int
	if err := repo.DB.QueryRowContext(ctx, `SELECT id
FROM users
WHERE id = $1
    AND role = 'customer'`, id).Scan(&customer); err != nil {
		return models.AdminOrderPage{}, err
	}
	return (CheckoutRepository{DB: repo.DB}).ListAdminOrders(ctx, limit, offset, models.OrderFilters{CustomerID: id}, "")
}
