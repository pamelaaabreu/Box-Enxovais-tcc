package repositories

import "database/sql"

type PromotionRepository struct{ DB *sql.DB }
