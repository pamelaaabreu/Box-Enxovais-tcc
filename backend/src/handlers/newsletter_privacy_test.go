package handlers

import (
	"backend/src/services"
	"context"
	"net/http/httptest"
	"strings"
	"testing"

	"gopkg.in/gomail.v2"
)

type newsletterPrivacyStore struct {
	saved  bool
	writes int
}

func (s *newsletterPrivacyStore) SaveIfNew(context.Context, string) (bool, error) {
	if s.saved {
		return false, nil
	}
	s.saved = true
	s.writes++
	return true, nil
}
func TestNewsletterPrivateAcknowledgementAfterSMTPFailure(t *testing.T) {
	store := &newsletterPrivacyStore{}
	service := services.NewNewsletterService(store)
	sent := 0
	service.Send = func(*gomail.Message) error { sent++; return services.ErrNewsletterDelivery }
	handler := NewsletterHandler{Service: service}
	var previous string
	for range 2 {
		w := httptest.NewRecorder()
		handler.SubscribeNewsletter(w, httptest.NewRequest("POST", "/api/newsletter/subscribe", strings.NewReader(`{"email":"private@example.invalid"}`)))
		if w.Code != 200 {
			t.Fatal(w.Code, w.Body.String())
		}
		if previous != "" && previous != w.Body.String() {
			t.Fatal("subscription existence exposed")
		}
		previous = w.Body.String()
	}
	if sent != 1 || store.writes != 1 {
		t.Fatal("duplicate subscription or immediate resend")
	}
}
