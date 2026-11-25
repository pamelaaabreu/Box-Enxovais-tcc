package repositories

import (
	"backend/src/models"
	"context"
	"database/sql"
	"errors"
	"fmt"
	"github.com/lib/pq"
	"strings"
)

type AccountRepository struct{ DB *sql.DB }

var ErrDuplicateCPF = errors.New("CPF já cadastrado em outra conta")

// coalesce -> substitui o null por outro valor ou string vazia.
const profileColumns = `    full_name,
    email,
    COALESCE(phone, ''),
    COALESCE(national_id, ''),
    COALESCE(to_char(birth_date, 'YYYY-MM-DD'), '')`

// função auxiliar que centraliza o preenchimento da struct AccountProfile com os dados retornados pelo banco.
func scanProfile(row rowScanner) (models.AccountProfile, error) {
	var p models.AccountProfile
	err := row.Scan(&p.Name, &p.Email, &p.Phone, &p.NationalID, &p.BirthDate)
	return p, err
}

// busca os dados do perfil do usuário através do ID.
func (repo AccountRepository) Profile(ctx context.Context, userID int) (models.AccountProfile, error) {
	return scanProfile(repo.DB.QueryRowContext(ctx, `SELECT
`+profileColumns+`
FROM users WHERE id=$1`, userID))
}

// Campos omitidos não entram no UPDATE; valores vazios limpam somente campos opcionais.
func (repo AccountRepository) UpdateProfile(ctx context.Context, userID int, patch models.AccountProfilePatch) (models.AccountProfile, error) {
	assignments := []string{}
	args := []any{userID}
	add := func(column string, value any) {
		args = append(args, value)
		assignments = append(assignments, fmt.Sprintf("%s = $%d", column, len(args)))
	}
	if patch.Name != nil {
		add("full_name", *patch.Name)
	}
	if patch.Phone != nil {
		add("phone", nullableText(*patch.Phone))
	}
	if patch.NationalID != nil {
		cpf := strings.NewReplacer(".", "", "-", "", " ", "").Replace(*patch.NationalID)
		if cpf != "" {
			var exists bool
			err := repo.DB.QueryRowContext(ctx, `
SELECT
    EXISTS (
    SELECT
        1
    FROM users
    WHERE id <> $1
        AND translate(national_id, '.- ', '') = $2
)
`, userID, cpf).Scan(&exists)
			if err != nil {
				return models.AccountProfile{}, err
			}
			if exists {
				return models.AccountProfile{}, ErrDuplicateCPF
			}
		}
		add("national_id", nullableText(cpf))
	}
	if patch.BirthDate != nil {
		add("birth_date", nullableText(*patch.BirthDate))
	}
	if len(assignments) == 0 {
		return repo.Profile(ctx, userID)
	}
	// As colunas acima são fixas; apenas os valores fornecidos entram nos parâmetros.
	query := `UPDATE users SET ` + strings.Join(assignments, ", ") + ` WHERE id = $1 RETURNING ` + profileColumns
	profile, err := scanProfile(repo.DB.QueryRowContext(ctx, query, args...))
	var violation *pq.Error
	if errors.As(err, &violation) && violation.Code == "23505" && (violation.Constraint == "users_national_id_key" || violation.Constraint == "users_cpf_key" || violation.Constraint == "users_national_id_normalized_key") {
		return profile, ErrDuplicateCPF
	}
	return profile, err
}
func nullableText(value string) any {
	if value == "" {
		return nil
	}
	return value
}

const addressColumns = `    id,
    label,
    is_default,
    recipient,
    zip_code,
    street,number,
    complement,
    neighborhood,
    city,
    state`

// função auxiliar que preenche os dados de um endereço,
// utiliza uma interface para aceitar tanto *sql.Row quanto *sql.Rows,
// pois ambos possuem o método Scan(), evitando duplicação de código.
func scanAddress(row rowScanner) (models.UserAddress, error) {
	var a models.UserAddress
	err := row.Scan(
		&a.ID,
		&a.Label,
		&a.IsDefault,
		&a.Recipient,
		&a.ZipCode,
		&a.Street,
		&a.Number,
		&a.Complement,
		&a.Neighborhood,
		&a.City,
		&a.State,
	)
	return a, err
}

func (repo AccountRepository) Addresses(ctx context.Context, userID int) ([]models.UserAddress, error) {
	return readAddresses(ctx, repo.DB, userID)
}

// consulta os endereços cadastrados de um usuário
func readAddresses(ctx context.Context, reader queryReader, userID int) ([]models.UserAddress, error) {

	rows, err := reader.QueryContext(ctx, `SELECT
`+addressColumns+`
FROM user_addresses
WHERE user_id = $1
ORDER BY is_default DESC,
    id
`, userID)

	if err != nil {
		return nil, err
	}

	// libera os recursos da consulta ao finalizar a função.
	defer rows.Close()

	addresses := []models.UserAddress{}

	// percorre cada endereço retornado no banco e preenche a struct com o helper scanAddress
	for rows.Next() {
		a, err := scanAddress(rows)
		if err != nil {
			return nil, err
		}
		addresses = append(addresses, a)
	}
	return addresses, rows.Err()
}

// bloqueia o registro do usuário durante a transação, evitando conflitos entre operações concorrentes.
func lockAccount(ctx context.Context, tx *sql.Tx, userID int) error {
	return tx.QueryRowContext(ctx, `SELECT id
FROM users
WHERE id = $1
FOR UPDATE`, userID).Scan(&userID)
}

func insertAddress(ctx context.Context, tx *sql.Tx, userID int, a models.UserAddress) (models.UserAddress, error) {

	// NOT EXISTS verifica se o usuário ainda não possui endereços
	return scanAddress(tx.QueryRowContext(ctx, `
INSERT INTO user_addresses(user_id, label, recipient, zip_code, street, number, complement, neighborhood, city,
state, is_default)
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
NOT EXISTS (
    SELECT
        1
    FROM user_addresses
    WHERE user_id = $1
))
RETURNING
`+addressColumns,
		userID,
		a.Label,
		a.Recipient,
		a.ZipCode,
		a.Street,
		a.Number,
		a.Complement,
		a.Neighborhood,
		a.City,
		a.State,
	))
}

// cadastra ou atualiza um endereço do usuário.
func (repo AccountRepository) SaveAddress(ctx context.Context, userID int, id int64, a models.UserAddress) (models.UserAddress, error) {
	if id != 0 {
		return repo.updateAddress(ctx, userID, id, a)
	}

	// inicia uma transação para cadastrar o endereço.
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return a, err
	}

	// garante o encerramento da transação
	defer tx.Rollback()

	// block p/ evitar conflitos entre cadastros simultâneos de endereços.
	if err = lockAccount(ctx, tx, userID); err != nil {
		return a, err
	}

	a, err = insertAddress(ctx, tx, userID, a)
	if err != nil {
		return a, err
	}

	return a, tx.Commit()
}

func (repo AccountRepository) DeleteAddress(ctx context.Context, userID int, id int64) error {
	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer tx.Rollback()

	if err = lockAccount(ctx, tx, userID); err != nil {
		return err
	}

	// armazena se o endereço excluído era o padrão.
	var wasDefault bool

	// exclui o endereço e recupera seu valor de is_default.
	if err = tx.QueryRowContext(ctx, `
DELETE
FROM user_addresses
WHERE user_id = $1
    AND id = $2
RETURNING is_default
`, userID, id).Scan(&wasDefault); err != nil {
		return err
	}

	// se o endereço excluído era o padrão, define o endereço de menor ID como novo padrão.
	if wasDefault {
		if _, err = tx.ExecContext(ctx, `
UPDATE user_addresses
SET is_default = true,
updated_at = now()
WHERE id = (
    SELECT
        MIN(id)
    FROM user_addresses
    WHERE user_id = $1
)
`, userID); err != nil {
			return err
		}
	}

	return tx.Commit()
}

func (repo AccountRepository) SetDefaultAddress(ctx context.Context, userID int, id int64) error {

	tx, err := repo.DB.BeginTx(ctx, nil)
	if err != nil {
		return err
	}

	defer tx.Rollback()

	if err = lockAccount(ctx, tx, userID); err != nil {
		return err
	}

	// desmarca o endereço padrão anterior, desconsiderando o endereço selecionado.
	if _, err = tx.ExecContext(ctx, `
UPDATE user_addresses
SET is_default = false,
updated_at = now()
WHERE user_id = $1
    AND is_default
    AND id <> $2
`, userID, id); err != nil {
		return err
	}

	if err = tx.QueryRowContext(ctx, `
UPDATE user_addresses
SET is_default = true,
updated_at = now()
WHERE user_id = $1
    AND id = $2
RETURNING id
`, userID, id).Scan(&id); err != nil {
		return err
	}

	return tx.Commit()
}
func (repo AccountRepository) updateAddress(ctx context.Context, userID int, id int64, a models.UserAddress) (models.UserAddress, error) {
	return scanAddress(repo.DB.QueryRowContext(ctx, `
UPDATE user_addresses
SET label = $3,
recipient = $4,
zip_code = $5,
street = $6,
number = $7,
complement = $8,
neighborhood = $9,
city = $10,
state = $11,
updated_at = now()
WHERE user_id = $1
    AND id = $2
RETURNING
`+addressColumns,
		userID,
		id,
		a.Label,
		a.Recipient,
		a.ZipCode,
		a.Street,
		a.Number,
		a.Complement,
		a.Neighborhood,
		a.City,
		a.State,
	))
}
