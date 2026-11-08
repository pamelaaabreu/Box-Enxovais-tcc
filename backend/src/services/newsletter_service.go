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
	from := mail.NewEmail("Pamela Abreu", "vitoria201547@gmail.com")
	to := mail.NewEmail("", email)
	subject := "Bem-vindo à Box Enxovais! 🎉"
	htmlContent := `
		<div style="font-family: Arial, sans-serif; text-align: center; padding: 20px;">
		  <h2>Obrigado por se inscrever!</h2>
		  <p>Como prometido, aqui está seu cupom de 10% de desconto para sua primeira compra.</p>
		  <p style="font-size: 24px; font-weight: bold; color: #8b4513; border: 2px dashed #8b4513; padding: 10px; margin: 20px auto; max-width: 200px;">
			BEMVINDO10
		  </p>
		  <p>Aproveite!</p>
		  <p><strong>Equipe Box Enxovais</strong></p>
		</div>
	`
	message := mail.NewSingleEmail(from, subject, to, "Use o cupom BEMVINDO10", htmlContent)

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
