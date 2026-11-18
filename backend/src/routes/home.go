package routes

import (
	"backend/src/handlers"
	middlewares "backend/src/middleware"
	"net/http"
)

func InitRoutesHome(mux *http.ServeMux, h handlers.HomeHandler) {
	mux.HandleFunc("GET /home/highlights", h.Highlights)
	mux.HandleFunc("GET /home/categories", h.Categories)
	mux.HandleFunc("GET /home/campaign", h.Campaign)
	mux.HandleFunc("GET /home/reviews", h.Reviews)
	mux.HandleFunc("GET /orders/{id}/review", middlewares.AuthMiddleware(h.Review))
	mux.HandleFunc("POST /orders/{id}/review", middlewares.AuthMiddleware(h.Review))
	mux.HandleFunc("GET /admin/experience-reviews", middlewares.AuthMiddleware(middlewares.AdminMiddleware(h.AdminReviews)))
	mux.HandleFunc("PATCH /admin/experience-reviews/{id}", middlewares.AuthMiddleware(middlewares.AdminMiddleware(h.Moderate)))
}
