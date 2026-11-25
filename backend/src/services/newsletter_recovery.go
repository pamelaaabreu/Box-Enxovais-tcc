package services

import (
	"context"
	"crypto/rand"
	"log"
	"sync"
	"time"
)

const (
	newsletterRetryInterval   = time.Minute
	newsletterMaxAttempts     = 3
	newsletterRetryBatch      = 5
	newsletterPendingLimit    = 256
	newsletterPendingLifetime = 24 * time.Hour
)

type newsletterDelivery struct {
	email       string
	messageID   string
	createdAt   time.Time
	nextAttempt time.Time
	attempts    int
	inFlight    bool
}
type newsletterRecovery struct {
	mu      sync.Mutex
	pending map[string]newsletterDelivery
	now     func() time.Time
}

func NewNewsletterService(store NewsletterStore) NewsletterService {
	return NewsletterService{Store: store, recovery: &newsletterRecovery{pending: map[string]newsletterDelivery{}, now: time.Now}}
}
func newNewsletterDelivery(email string) newsletterDelivery {
	return newsletterDelivery{email: email, messageID: "<newsletter." + rand.Text() + "@box-enxovais.local>", createdAt: time.Now(), attempts: 1}
}
func (recovery *newsletterRecovery) retain(delivery newsletterDelivery) {
	recovery.mu.Lock()
	defer recovery.mu.Unlock()
	now := recovery.now()
	for email, pending := range recovery.pending {
		if now.Sub(pending.createdAt) >= newsletterPendingLifetime && !pending.inFlight {
			delete(recovery.pending, email)
		}
	}
	if len(recovery.pending) >= newsletterPendingLimit {
		log.Println("Newsletter: limite de confirmações pendentes atingido")
		return
	}
	delivery.createdAt = now
	delivery.nextAttempt = now.Add(newsletterRetryInterval)
	recovery.pending[delivery.email] = delivery
}
func (service NewsletterService) deliver(delivery newsletterDelivery) error {
	send := service.Send
	if send == nil {
		send = sendNewsletterSMTP
	}
	message := newsletterMessage(delivery.email)
	message.SetHeader("Message-ID", delivery.messageID)
	message.SetDateHeader("Date", delivery.createdAt)
	return send(message)
}

// Trabalha somente com falhas de envio conhecidas; uma inscrição repetida não agenda mensagens.
func (service NewsletterService) retryPending(ctx context.Context) {
	if ctx.Err() != nil {
		return
	}
	recovery := service.recovery
	if recovery == nil {
		return
	}
	recovery.mu.Lock()
	now := recovery.now()
	batch := make([]newsletterDelivery, 0, newsletterRetryBatch)
	for email, delivery := range recovery.pending {
		if now.Sub(delivery.createdAt) >= newsletterPendingLifetime && !delivery.inFlight {
			delete(recovery.pending, email)
			continue
		}
		if len(batch) == newsletterRetryBatch || delivery.inFlight || delivery.attempts >= newsletterMaxAttempts || now.Before(delivery.nextAttempt) {
			continue
		}
		delivery.inFlight = true
		delivery.attempts++
		recovery.pending[email] = delivery
		batch = append(batch, delivery)
	}
	recovery.mu.Unlock()
	for _, delivery := range batch {
		err := ctx.Err()
		if err == nil {
			err = service.deliver(delivery)
		}
		recovery.mu.Lock()
		if err == nil {
			delete(recovery.pending, delivery.email)
		} else {
			delivery.inFlight = false
			delivery.nextAttempt = recovery.now().Add(newsletterRetryInterval)
			recovery.pending[delivery.email] = delivery
			if delivery.attempts == newsletterMaxAttempts {
				log.Println("Newsletter: confirmação pendente atingiu o limite de tentativas")
			}
		}
		recovery.mu.Unlock()
	}
}
func (service NewsletterService) RunRetries(ctx context.Context) {
	ticker := time.NewTicker(newsletterRetryInterval)
	defer ticker.Stop()
	for {
		select {
		case <-ctx.Done():
			return
		case <-ticker.C:
			service.retryPending(ctx)
		}
	}
}
