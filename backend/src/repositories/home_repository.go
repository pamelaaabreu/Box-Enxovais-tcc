package repositories

import "database/sql"

type HomeRepository struct {
	DB *sql.DB
}
