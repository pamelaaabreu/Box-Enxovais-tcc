package services

import (
	"context"
	"errors"

	"gopkg.in/gomail.v2"
)

var ErrNewsletterEmailRequired = errors.New("newsletter email required")
var ErrNewsletterEmailInvalid = errors.New("newsletter email invalid")
var ErrNewsletterPersistence = errors.New("newsletter persistence failed")
var ErrNewsletterConfiguration = errors.New("newsletter SMTP not configured")
var ErrNewsletterDelivery = errors.New("newsletter delivery failed")

type NewsletterStore interface {
	SaveIfNew(context.Context, string) (bool, error)
}
type NewsletterService struct {
	Store    NewsletterStore
	recovery *newsletterRecovery

	// Permite substituir o envio SMTP durante os testes.
	Send func(*gomail.Message) error
}

func (service NewsletterService) Subscribe(
	ctx context.Context,
	email string,
) error {

	// Remove espaços das extremidades.
	email = normalizeEmail(email)

	if email == "" {
		return ErrNewsletterEmailRequired
	}

	// Verifica se o contexto ainda está válido.
	if err := ctx.Err(); err != nil {
		return err
	}

	if !isValidEmail(email) {
		return ErrNewsletterEmailInvalid
	}
	if service.Send == nil {
		if _, _, _, err := smtpConfiguration(); err != nil {
			return err
		}
	}

	if service.Store == nil {
		return ErrNewsletterPersistence
	}
	created, err := service.Store.SaveIfNew(ctx, email)
	if err != nil {
		return errors.Join(ErrNewsletterPersistence, err)
	}
	if !created {
		return nil
	}
	// SMTP não participa da transação: a inscrição persiste mesmo se a confirmação falhar.
	delivery := newNewsletterDelivery(email)
	if err = service.deliver(delivery); err != nil {
		if service.recovery != nil {
			service.recovery.retain(delivery)
		}
		return errors.Join(ErrNewsletterDelivery, err)
	}
	return nil
}
func sendNewsletterSMTP(message *gomail.Message) error { return sendSMTP(message) }

func newsletterMessage(email string) *gomail.Message {
	return newEmailMessage(email, "Bem-vindo à Box Enxovais",
		"Sua inscrição foi recebida. Acompanhe novidades e campanhas da loja.",
		`<div style="font-family:Montserrat,Arial,sans-serif;color:#3d4836;padding:24px"><h2>Obrigado por se inscrever!</h2><p>Sua inscrição foi recebida. Acompanhe novidades e campanhas da loja.</p><p>Equipe Box Enxovais</p></div>`)
}
