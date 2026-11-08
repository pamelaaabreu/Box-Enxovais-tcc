package services

import (
	"bytes"
	"fmt"
	"html/template"
	"log"
	"os"
	"path/filepath"

	"gopkg.in/gomail.v2"
)

func SendEmailWithTemplate(email, subject, code string) error {
	messageEmail, err := buildRecoveryEmail(email, subject, code,
		filepath.Join("src", "templates", "email_template.html"), filepath.Join("src", "templates", "assets"))
	if err != nil {
		return err
	}

	dialer := gomail.NewDialer(
		os.Getenv("EMAIL_SMTP"),
		587,
		os.Getenv("EMAIL"),
		os.Getenv("EMAIL_KEY"),
	)

	if err := dialer.DialAndSend(messageEmail); err != nil {
		log.Printf("[EMAIL] Erro ao enviar e-mail: %v", err)
		return fmt.Errorf("enviar e-mail: %w", err)
	}

	log.Println("[EMAIL] E-mail enviado com sucesso")

	return nil
}

// Build separately from SMTP to verify MIME without sending mail.
func buildRecoveryEmail(email, subject, code, templatePath, assetsDir string) (*gomail.Message, error) {
	tmpl, err := template.ParseFiles(templatePath)
	if err != nil {
		log.Printf("[EMAIL] Erro ao carregar template: %v", err)
		return nil, fmt.Errorf("carregar template: %w", err)
	}

	data := struct {
		Message string
		Code    string
	}{
		Message: code,
		Code:    code,
	}

	var body bytes.Buffer

	if err := tmpl.Execute(&body, data); err != nil {
		log.Printf("[EMAIL] Erro ao renderizar template: %v", err)
		return nil, fmt.Errorf("renderizar template: %w", err)
	}

	messageEmail := gomail.NewMessage()

	messageEmail.SetHeader("From", os.Getenv("EMAIL"))
	messageEmail.SetHeader("To", email)
	messageEmail.SetHeader("Subject", subject)

	messageEmail.SetBody("text/plain", fmt.Sprintf("Box Enxovais\n\nSeu código de recuperação: %s\nVálido por 5 minutos após o envio.\nUse o código para continuar a redefinição da sua senha.\n\nNão solicitou essa alteração? Pode ignorar este e-mail. Sua senha permanecerá inalterada.\n\nEste é um e-mail automático. Não é necessário responder.", code))
	messageEmail.AddAlternative("text/html", body.String())

	images := []string{
		"email-hero.png",
		"email-shield.png",
	}

	for _, filename := range images {
		imagePath := filepath.Join(assetsDir, filename)

		info, err := os.Stat(imagePath)

		if err != nil {
			log.Printf(
				"[EMAIL] Imagem não encontrada: %s | %v",
				imagePath,
				err,
			)

			return nil, fmt.Errorf(
				"localizar imagem %s: %w",
				filename,
				err,
			)
		}

		if info.IsDir() {
			return nil, fmt.Errorf(
				"o caminho da imagem é um diretório: %s",
				imagePath,
			)
		}

		messageEmail.Embed(
			imagePath,
			gomail.SetHeader(map[string][]string{
				"Content-ID":          {fmt.Sprintf("<%s>", filename)},
				"Content-Disposition": {"inline"},
			}),
		)

		log.Printf("[EMAIL] Imagem incorporada: %s", filename)
	}

	return messageEmail, nil
}
