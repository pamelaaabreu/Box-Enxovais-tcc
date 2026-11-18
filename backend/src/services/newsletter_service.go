package services

import (
	"backend/src/repositories"
	"context"
	"errors"
	"log"

	"github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

var ErrNewsletterEmailRequired = errors.New("newsletter email required")
var ErrNewsletterConfiguration = errors.New("newsletter client not configured")
var ErrNewsletterDelivery = errors.New("newsletter delivery failed")
var ErrNewsletterRejected = errors.New("newsletter delivery rejected")

type NewsletterService struct {
	Store  repositories.SubscriberRepository
	Client *sendgrid.Client
}

func (service NewsletterService) Subscribe(ctx context.Context, email string) error {
	if email == "" {
		return ErrNewsletterEmailRequired
	}
	if service.Client == nil {
		return ErrNewsletterConfiguration
	}
	message := newsletterMessage(email)

	response, err := service.Client.SendWithContext(ctx, message)
	if err != nil {
		return errors.Join(ErrNewsletterDelivery, err)
	}
	if response.StatusCode < 200 || response.StatusCode >= 300 {
		log.Printf("Newsletter delivery rejected with status %d", response.StatusCode)
		return ErrNewsletterRejected
	}
	// Keep a successful response after delivery even if subscriber persistence fails.
	if err := service.Store.Save(ctx, email); err != nil {
		log.Println("Newsletter subscriber persistence failed")
	}
	return nil
}

func newsletterMessage(email string) *mail.SGMailV3 {
	from := mail.NewEmail("Box Enxovais", "vitoria201547@gmail.com")
	to := mail.NewEmail("", email)
	html := `<div style="font-family:Montserrat,Arial,sans-serif;color:#3d4836;padding:24px"><h2>Obrigado por se inscrever!</h2><p>Sua inscrição foi recebida. Acompanhe novidades e campanhas da loja.</p><p>Equipe Box Enxovais</p></div>`
	return mail.NewSingleEmail(from, "Bem-vindo à Box Enxovais", to, "Sua inscrição foi recebida. Acompanhe novidades e campanhas da loja.", html)
}
