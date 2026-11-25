package services

import (
	"crypto/tls"
	"os"
	"strings"

	"gopkg.in/gomail.v2"
)

func smtpConfiguration() (string, string, string, error) {
	host := strings.TrimSpace(os.Getenv("EMAIL_SMTP"))
	from := strings.TrimSpace(os.Getenv("EMAIL"))
	key := os.Getenv("EMAIL_KEY")
	if host == "" || from == "" || key == "" {
		return "", "", "", ErrNewsletterConfiguration
	}
	return host, from, key, nil
}
func sendSMTP(message *gomail.Message) error {
	host, from, key, err := smtpConfiguration()
	if err != nil {
		return err
	}
	dialer := gomail.NewDialer(host, 587, from, key)
	dialer.TLSConfig = &tls.Config{ServerName: host, MinVersion: tls.VersionTLS12}
	if err = dialer.DialAndSend(message); err != nil {
		return ErrNewsletterDelivery
	}
	return nil
}
