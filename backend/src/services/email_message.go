package services

import (
	"os"
	"strings"

	"gopkg.in/gomail.v2"
)

// Gomail aplica RFC 2047 ao assunto uma única vez; os textos recebidos já são UTF-8.
func newEmailMessage(recipient, subject, plain, html string) *gomail.Message {
	message := gomail.NewMessage(gomail.SetCharset("UTF-8"), gomail.SetEncoding(gomail.QuotedPrintable))
	message.SetAddressHeader("From", strings.TrimSpace(os.Getenv("EMAIL")), "Box Enxovais")
	message.SetHeader("To", recipient)
	message.SetHeader("Subject", subject)
	message.SetBody("text/plain", plain)
	message.AddAlternative("text/html", html)
	return message
}
