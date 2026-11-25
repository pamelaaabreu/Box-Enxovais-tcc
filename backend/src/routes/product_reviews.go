package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesProductReviews(mux *http.ServeMux, reviews handlers.ProductReviewHandler) {
	authenticatedRoute(mux, "GET /me/product-reviews", reviews.Mine)
	authenticatedRoute(mux, "GET /me/review-products", reviews.Reviewable)
	authenticatedRoute(mux, "POST /products/{id}/reviews", reviews.Save)
	authenticatedRoute(mux, "PATCH /me/product-reviews/{id}", reviews.Save)
	publicRoute(mux, "GET /products/review-summaries", reviews.Summaries)
	publicRoute(mux, "GET /products/{id}/reviews", reviews.Public)
	publicRoute(mux, "GET /home/product-reviews", reviews.Home)
	adminRoute(mux, "GET /admin/product-reviews", reviews.Admin)
	adminRoute(mux, "PATCH /admin/product-reviews/{id}", reviews.Moderate)
}
