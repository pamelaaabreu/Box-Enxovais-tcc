package services

import (
	"bytes"
	"context"
	"errors"
	"gopkg.in/gomail.v2"
	"strings"
	"testing"
)

func TestNewsletterDoesNotPromiseUnconfiguredBenefits(t *testing.T) {
	t.Setenv("EMAIL", "store@example.invalid")
	var buffer bytes.Buffer
	_, e := newsletterMessage("newsletter@example.invalid").WriteTo(&buffer)
	b := buffer.Bytes()
	if e != nil {
		t.Fatal(e)
	}
	content := strings.ToLower(string(b))
	for _, s := range []string{"bemvindo10", "cupom", "10%"} {
		if strings.Contains(content, s) {
			t.Fatal("unconfigured benefit in confirmation")
		}
	}
	if !strings.Contains(content, "novidades") {
		t.Fatal("missing subscription confirmation")
	}
}

func TestNewsletterRequiresSMTPConfiguration(t *testing.T) {
	t.Setenv("EMAIL_SMTP", "")
	if err := (NewsletterService{}).Subscribe(context.Background(), "newsletter@example.invalid"); !errors.Is(err, ErrNewsletterConfiguration) {
		t.Fatalf("expected configuration error, got %v", err)
	}
}
func TestNewsletterRejectsEmptyEmail(t *testing.T) {
	if err := (NewsletterService{}).Subscribe(context.Background(), "   "); !errors.Is(err, ErrNewsletterEmailRequired) {
		t.Fatalf("expected required email error, got %v", err)
	}
}

func TestNewsletterDeliveryFailurePreservesSubscription(t *testing.T) {
	calls := 0
	store := &newsletterFakeStore{}
	service := NewsletterService{Store: store, Send: func(message *gomail.Message) error {
		calls++
		if got := message.GetHeader("To"); len(got) != 1 || got[0] != "newsletter@example.invalid" {
			t.Fatal("wrong recipient")
		}
		return ErrNewsletterDelivery
	}}
	if err := service.Subscribe(context.Background(), "newsletter@example.invalid"); !errors.Is(err, ErrNewsletterDelivery) {
		t.Fatalf("expected delivery error, got %v", err)
	}
	if !store.saved {
		t.Fatal("subscription must persist before delivery")
	}
	if calls != 1 {
		t.Fatal("expected one delivery attempt")
	}
}

type newsletterFakeStore struct {
	saved bool
	err   error
}

func (store *newsletterFakeStore) SaveIfNew(_ context.Context, _ string) (bool, error) {
	if store.err != nil {
		return false, store.err
	}
	if store.saved {
		return false, nil
	}
	store.saved = true
	return true, nil
}
