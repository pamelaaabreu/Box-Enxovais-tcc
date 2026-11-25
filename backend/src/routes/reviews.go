package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesReviews(mux *http.ServeMux, home handlers.HomeHandler) {
	publicRoute(mux, "GET /home/reviews", home.Reviews)
	authenticatedRoute(mux, "GET /me/experience-reviews", home.MyReviews)
	for _, pattern := range []string{"GET /orders/{id}/review", "POST /orders/{id}/review", "PATCH /orders/{id}/review"} {
		authenticatedRoute(mux, pattern, home.Review)
	}
	adminRoute(mux, "GET /admin/experience-reviews", home.AdminReviews)
	adminRoute(mux, "PATCH /admin/experience-reviews/{id}", home.Moderate)
}
