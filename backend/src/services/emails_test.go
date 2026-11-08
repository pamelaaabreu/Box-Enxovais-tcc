package services

import (
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
	"time"
)

func TestRecoveryEmailMIME(t *testing.T) {
	t.Setenv("EMAIL", "sender@example.com")
	assets := filepath.Join("..", "templates", "assets")
	message, err := buildRecoveryEmail("recipient@example.com", "Recuperação de senha", "AB12CD34", filepath.Join("..", "templates", "email_template.html"), assets)
	if err != nil {
		t.Fatal(err)
	}
	var raw bytes.Buffer
	if _, err = message.WriteTo(&raw); err != nil {
		t.Fatal(err)
	}
	parsed, err := mail.ReadMessage(&raw)
	if err != nil {
		t.Fatal(err)
	}
	if parsed.Header.Get("To") != "recipient@example.com" {
		t.Fatal("recipient changed")
	}
	bodies := map[string]string{}
	images := map[string][]byte{}
	hasRelated := false
	var inspect func(textproto.MIMEHeader, io.Reader)
	inspect = func(header textproto.MIMEHeader, reader io.Reader) {
		kind, params, err := mime.ParseMediaType(header.Get("Content-Type"))
		if err != nil {
			t.Fatal(err)
		}
		if strings.HasPrefix(kind, "multipart/") {
			if kind == "multipart/related" {
				hasRelated = true
			}
			parts := multipart.NewReader(reader, params["boundary"])
			for {
				part, err := parts.NextPart()
				if err == io.EOF {
					break
				}
				if err != nil {
					t.Fatal(err)
				}
				inspect(part.Header, part)
			}
			return
		}
		switch header.Get("Content-Transfer-Encoding") {
		case "base64":
			reader = base64.NewDecoder(base64.StdEncoding, reader)
		case "quoted-printable":
			reader = quotedprintable.NewReader(reader)
		}
		data, err := io.ReadAll(reader)
		if err != nil {
			t.Fatal(err)
		}
		if strings.HasPrefix(kind, "image/") {
			id := strings.Trim(header.Get("Content-ID"), "<>")
			if _, duplicate := images[id]; duplicate {
				t.Fatal("duplicate CID")
			}
			if !strings.HasPrefix(header.Get("Content-Disposition"), "inline") {
				t.Fatal("image is not inline")
			}
			images[id] = data
		} else {
			bodies[kind] = string(data)
		}
	}
	inspect(textproto.MIMEHeader(parsed.Header), parsed.Body)
	for _, kind := range []string{"text/html", "text/plain"} {
		if !strings.Contains(bodies[kind], "AB12CD34") || !strings.Contains(bodies[kind], "5 minutos") {
			t.Fatalf("missing code or expiry in %s", kind)
		}
		if strings.Contains(bodies[kind], "{{.Message}}") {
			t.Fatal("unrendered template")
		}
	}
	html := bodies["text/html"]
	for _, forbidden := range []string{`href="#"`, "fonts.googleapis.com", "@font-face", "<script"} {
		if strings.Contains(html, forbidden) {
			t.Fatalf("unexpected %s", forbidden)
		}
	}
	refs := regexp.MustCompile(`cid:([^"\s]+)`).FindAllStringSubmatch(html, -1)
	if !hasRelated {
		t.Fatal("inline images require multipart/related")
	}
	if _, unused := images["email-leaf.png"]; unused {
		t.Fatal("unused leaf must not be embedded")
	}
	if len(refs) != 2 || len(images) != len(refs) {
		t.Fatal("CID/image count mismatch")
	}
	for _, ref := range refs {
		expected, err := os.ReadFile(filepath.Join(assets, ref[1]))
		if err != nil {
			t.Fatal(err)
		}
		if !bytes.Equal(expected, images[ref[1]]) {
			t.Fatalf("missing or corrupt embedded image %s", ref[1])
		}
	}
}

func TestRecoveryEmailEscapesHTML(t *testing.T) {
	t.Setenv("EMAIL", "sender@example.com")
	message, err := buildRecoveryEmail("recipient@example.com", "Test", "<unsafe>", filepath.Join("..", "templates", "email_template.html"), filepath.Join("..", "templates", "assets"))
	if err != nil {
		t.Fatal(err)
	}
	var raw bytes.Buffer
	if _, err := message.WriteTo(&raw); err != nil {
		t.Fatal(err)
	}
	if !strings.Contains(raw.String(), "&lt;unsafe&gt;") {
		t.Fatal("HTML is not escaped")
	}
}

func TestRecoveryEmailMissingAsset(t *testing.T) {
	_, err := buildRecoveryEmail("recipient@example.com", "Test", "AB12CD34", filepath.Join("..", "templates", "email_template.html"), t.TempDir())
	if err == nil {
		t.Fatal("missing asset should prevent sending")
	}
}

func TestRecoveryEmailFiveMinuteValidity(t *testing.T) {
	email := "email-expiry-test@example.com"
	before := time.Now()
	issue(t, email)
	after := time.Now()
	recoveryMu.Lock()
	expiry := verificationCodes[email].ExpiresAt
	recoveryMu.Unlock()
	if expiry.Before(before.Add(5*time.Minute)) || expiry.After(after.Add(5*time.Minute)) {
		t.Fatal("email validity differs from recovery service")
	}
}
