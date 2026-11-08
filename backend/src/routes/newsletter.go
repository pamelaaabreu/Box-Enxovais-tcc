package routes

import (
	"backend/src/handlers"
	"net/http"
)

func InitRoutesNewsletter(mux *http.ServeMux, newsletter handlers.NewsletterHandler) {
	publicRoute(mux, http.MethodPost, "/api/newsletter/subscribe", newsletter.SubscribeNewsletter)
}
