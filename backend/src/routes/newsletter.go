package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesNewsletter(mux *http.ServeMux, newsletter handlers.NewsletterHandler) {
	publicRoute(mux, "POST /api/newsletter/subscribe", newsletter.SubscribeNewsletter)
}
