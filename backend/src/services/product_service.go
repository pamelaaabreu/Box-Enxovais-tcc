package services

import "backend/src/repositories"

type ProductService struct {
	Store repositories.ProductRepository
}
