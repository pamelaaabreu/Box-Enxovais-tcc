package services

import (
	"backend/src/models"
	"bytes"
	"encoding/base64"
	"io"
	"mime"
	"mime/multipart"
	"mime/quotedprintable"
	"net/mail"
	"net/textproto"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"testing"
	"unicode/utf8"

	"gopkg.in/gomail.v2"
)

func decodeEmailForTest(t *testing.T, message *gomail.Message) (string, map[string]string) {
	t.Helper()
	var raw bytes.Buffer
	if _, err := message.WriteTo(&raw); err != nil {
		t.Fatal(err)
	}
	parsed, err := mail.ReadMessage(&raw)
	if err != nil {
		t.Fatal(err)
	}
	rawSubject := parsed.Header.Get("Subject")
	if !strings.Contains(strings.ToUpper(rawSubject), "=?UTF-8?") {
		t.Fatal("non-ASCII subject must use RFC 2047 UTF-8")
	}
	subject, err := new(mime.WordDecoder).DecodeHeader(rawSubject)
	if err != nil {
		t.Fatal(err)
	}
	bodies := map[string]string{}
	var visit func(textproto.MIMEHeader, io.Reader)
	visit = func(header textproto.MIMEHeader, reader io.Reader) {
		kind, params, err := mime.ParseMediaType(header.Get("Content-Type"))
		if err != nil {
			t.Fatal(err)
		}
		if strings.HasPrefix(kind, "multipart/") {
			parts := multipart.NewReader(reader, params["boundary"])
			for {
				part, err := parts.NextRawPart()
				if err == io.EOF {
					break
				}
				if err != nil {
					t.Fatal(err)
				}
				visit(part.Header, part)
				if err = part.Close(); err != nil {
					t.Fatal(err)
				}
			}
			return
		}
		if kind != "text/plain" && kind != "text/html" {
			return
		}
		if !strings.EqualFold(params["charset"], "UTF-8") {
			t.Fatalf("%s missing UTF-8 charset", kind)
		}
		switch strings.ToLower(header.Get("Content-Transfer-Encoding")) {
		case "quoted-printable":
			reader = quotedprintable.NewReader(reader)
		case "base64":
			reader = base64.NewDecoder(base64.StdEncoding, reader)
		default:
			t.Fatalf("%s missing safe transfer encoding", kind)
		}
		body, err := io.ReadAll(reader)
		if err != nil {
			t.Fatal(err)
		}
		if !utf8.Valid(body) {
			t.Fatal("decoded body is not UTF-8")
		}
		bodies[kind] = strings.ReplaceAll(string(body), "\r\n", "\n")
	}
	visit(textproto.MIMEHeader(parsed.Header), parsed.Body)
	if len(bodies) != 2 {
		t.Fatal("plain/HTML alternatives missing")
	}
	return subject, bodies
}

func TestAllEmailUTF8RoundTrip(t *testing.T) {
	t.Setenv("EMAIL", "sender@example.invalid")
	templates := filepath.Join("..", "templates")
	order := models.CheckoutOrder{ID: 42, Total: 25980, ReceiptItems: []models.CartItem{{Name: "Lençol de algodão", Quantity: 2, UnitPrice: 12990}}}
	cases := []struct {
		name, subject string
		build         func() (*gomail.Message, error)
		plain, html   []string
	}{
		{"newsletter", "Bem-vindo à Box Enxovais", func() (*gomail.Message, error) { return newsletterMessage("recipient@example.invalid"), nil }, []string{"Sua inscrição foi recebida. Acompanhe novidades e campanhas da loja."}, []string{"Sua inscrição foi recebida."}},
		{"recovery", "Recuperação de senha — confirmação", func() (*gomail.Message, error) {
			return buildRecoveryEmail("recipient@example.invalid", "Recuperação de senha — confirmação", "AB12CD34", filepath.Join(templates, "email_template.html"), filepath.Join(templates, "assets"))
		}, []string{"Seu código de recuperação: AB12CD34", "Não solicitou essa alteração?"}, []string{"solicitação", "AB12CD34"}},
		{"confirmation", "Box Enxovais — Pedido #42 confirmado", func() (*gomail.Message, error) {
			return buildOrderEmail("recipient@example.invalid", "João Gonçalves", order, false, templates)
		}, []string{"Olá, João Gonçalves!", "Lençol de algodão", "Nenhuma cobrança foi realizada."}, []string{"João Gonçalves", "Lençol de algodão"}},
		{"cancellation", "Box Enxovais — Pedido #42 cancelado", func() (*gomail.Message, error) {
			return buildOrderEmail("recipient@example.invalid", "João Gonçalves", order, true, templates)
		}, []string{"Olá, João Gonçalves!", "foi cancelado.", "Lençol de algodão"}, []string{"João Gonçalves", "cancelamento", "Lençol de algodão"}},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			message, err := tc.build()
			if err != nil {
				t.Fatal(err)
			}
			subject, bodies := decodeEmailForTest(t, message)
			if subject != tc.subject {
				t.Fatalf("decoded subject differs: %q", subject)
			}
			for _, part := range []struct {
				kind     string
				expected []string
			}{{"text/plain", tc.plain}, {"text/html", tc.html}} {
				for _, original := range part.expected {
					if !strings.Contains(bodies[part.kind], original) {
						t.Fatalf("%s lost original text %q", part.kind, original)
					}
				}
			}
			if tc.name == "newsletter" && strings.TrimSpace(bodies["text/plain"]) != tc.plain[0] {
				t.Fatal("newsletter plaintext differs from original")
			}
		})
	}
}
func TestEmailSourcesAreUTF8(t *testing.T) {
	// Detecta sequências típicas de dupla codificação sem rejeitar Ã legítimo em VERIFICAÇÃO.
	corrupted := regexp.MustCompile(`(?:Ã|Â)[\x{0080}-\x{00bf}]|\x{fffd}`)
	for _, path := range []string{"newsletter_service.go", "emails.go", "checkout_email.go", filepath.Join("..", "templates", "email_template.html"), filepath.Join("..", "templates", "checkout_receipt.html"), filepath.Join("..", "templates", "order_cancelled.html")} {
		body, err := os.ReadFile(path)
		if err != nil {
			t.Fatal(err)
		}
		if !utf8.Valid(body) || corrupted.Match(body) {
			t.Errorf("invalid or corrupted text in %s", path)
		}
	}
}
