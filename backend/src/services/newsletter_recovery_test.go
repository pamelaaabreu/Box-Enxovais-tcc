package services

import (
	"context"
	"errors"
	"sync"
	"sync/atomic"
	"testing"
	"time"

	"gopkg.in/gomail.v2"
)

type recoverySubscriberStore struct {
	mu     sync.Mutex
	emails map[string]bool
	err    error
}

func (s *recoverySubscriberStore) SaveIfNew(_ context.Context, email string) (bool, error) {
	s.mu.Lock()
	defer s.mu.Unlock()
	if s.err != nil {
		return false, s.err
	}
	if s.emails == nil {
		s.emails = map[string]bool{}
	}
	if s.emails[email] {
		return false, nil
	}
	s.emails[email] = true
	return true, nil
}
func recoveryServiceForTest(t *testing.T) (NewsletterService, *time.Time) {
	t.Helper()
	t.Setenv("EMAIL", "sender@example.invalid")
	service := NewNewsletterService(&recoverySubscriberStore{})
	now := time.Now()
	service.recovery.now = func() time.Time { return now }
	return service, &now
}
func TestNewsletterControlledRecovery(t *testing.T) {
	service, now := recoveryServiceForTest(t)
	calls := 0
	var ids []string
	service.Send = func(message *gomail.Message) error {
		calls++
		ids = append(ids, message.GetHeader("Message-ID")[0])
		if calls == 1 {
			return errors.New("SMTP failure")
		}
		return nil
	}
	if err := service.Subscribe(context.Background(), "one@example.invalid"); !errors.Is(err, ErrNewsletterDelivery) {
		t.Fatal(err)
	}
	for range 10 {
		if err := service.Subscribe(context.Background(), "one@example.invalid"); err != nil {
			t.Fatal(err)
		}
	}
	service.retryPending(context.Background())
	if calls != 1 {
		t.Fatal("duplicate requests bypass cooldown")
	}
	*now = now.Add(newsletterRetryInterval)
	service.retryPending(context.Background())
	if calls != 2 || ids[0] != ids[1] || len(service.recovery.pending) != 0 {
		t.Fatal("recovery failed or message ID changed")
	}
	if err := service.Subscribe(context.Background(), "one@example.invalid"); err != nil || calls != 2 {
		t.Fatal("successful confirmation resent", err)
	}
}
func TestNewsletterRecoveryAttemptLimit(t *testing.T) {
	service, now := recoveryServiceForTest(t)
	calls := 0
	service.Send = func(*gomail.Message) error { calls++; return ErrNewsletterDelivery }
	_ = service.Subscribe(context.Background(), "limit@example.invalid")
	for range 10 {
		*now = now.Add(newsletterRetryInterval)
		service.retryPending(context.Background())
	}
	if calls != newsletterMaxAttempts {
		t.Fatalf("unbounded retries: %d", calls)
	}
	*now = now.Add(newsletterPendingLifetime)
	service.retryPending(context.Background())
	if len(service.recovery.pending) != 0 {
		t.Fatal("expired failures retained")
	}
}
func TestNewsletterRecoveryConcurrency(t *testing.T) {
	service, now := recoveryServiceForTest(t)
	var calls atomic.Int32
	started := make(chan struct{})
	release := make(chan struct{})
	service.Send = func(*gomail.Message) error {
		if calls.Add(1) == 1 {
			return ErrNewsletterDelivery
		}
		close(started)
		<-release
		return nil
	}
	_ = service.Subscribe(context.Background(), "race@example.invalid")
	*now = now.Add(newsletterRetryInterval)
	var workers sync.WaitGroup
	for range 10 {
		workers.Add(1)
		go func() { defer workers.Done(); service.retryPending(context.Background()) }()
	}
	<-started
	for range 20 {
		workers.Add(1)
		go func() {
			defer workers.Done()
			if err := service.Subscribe(context.Background(), "race@example.invalid"); err != nil {
				t.Error(err)
			}
		}()
	}
	close(release)
	workers.Wait()
	if calls.Load() != 2 {
		t.Fatalf("concurrent retry duplicated send: %d", calls.Load())
	}
}
func TestNewsletterRecoveryCancelled(t *testing.T) {
	service, _ := recoveryServiceForTest(t)
	calls := 0
	service.Send = func(*gomail.Message) error { calls++; return ErrNewsletterDelivery }
	_ = service.Subscribe(context.Background(), "cancel@example.invalid")
	ctx, cancel := context.WithCancel(context.Background())
	cancel()
	service.retryPending(ctx)
	service.RunRetries(ctx)
	if calls != 1 {
		t.Fatal("cancelled worker sent mail")
	}
}
