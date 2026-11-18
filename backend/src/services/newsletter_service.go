package services

import (
	"backend/src/repositories"
	"context"
	"crypto/tls"
	"errors"
	"log"
	"os"
	"strings"

	"gopkg.in/gomail.v2"
)

var ErrNewsletterEmailRequired = errors.New("newsletter email required")
var ErrNewsletterConfiguration = errors.New("newsletter SMTP not configured")
var ErrNewsletterDelivery = errors.New("newsletter delivery failed")

type NewsletterService struct {
	Store repositories.SubscriberRepository
	Send  func(*gomail.Message) error
}

func (service NewsletterService) Subscribe(ctx context.Context, email string) error {
	email = strings.TrimSpace(email)
	if email == "" {
		return ErrNewsletterEmailRequired
	}
	if err := ctx.Err(); err != nil {
		return err
	}
	send := service.Send
	if send == nil {
		send = sendNewsletterSMTP
	}
	if err := send(newsletterMessage(email)); err != nil {
		return err
	}
	if err := service.Store.Save(ctx, email); err != nil {
		log.Println("Newsletter subscriber persistence failed")
	}
	return nil
}

func sendNewsletterSMTP(message *gomail.Message) error {
	host, from, key := os.Getenv("EMAIL_SMTP"), os.Getenv("EMAIL"), os.Getenv("EMAIL_KEY")
	if host == "" || from == "" || key == "" {
		return ErrNewsletterConfiguration
	}
	dialer := gomail.NewDialer(host, 587, from, key)
	dialer.TLSConfig = &tls.Config{ServerName: host, MinVersion: tls.VersionTLS12}
	if err := dialer.DialAndSend(message); err != nil {
		return ErrNewsletterDelivery
	}
	return nil
}

func newsletterMessage(email string) *gomail.Message {
	message := gomail.NewMessage()
	message.SetAddressHeader("From", os.Getenv("EMAIL"), "Box Enxovais")
	message.SetHeader("To", email)
	message.SetHeader("Subject", "Bem-vindo Ã  Box Enxovais")
	message.SetBody("text/plain", "Sua inscriÃ§Ã£o foi recebida. Acompanhe novidades e campanhas da loja.")
	message.AddAlternative("text/html", `<div style="font-family:Montserrat,Arial,sans-serif;color:#3d4836;padding:24px"><h2>Obrigado por se inscrever!</h2><p>Sua inscriÃ§Ã£o foi recebida. Acompanhe novidades e campanhas da loja.</p><p>Equipe Box Enxovais</p></div>`)
	return message
}
