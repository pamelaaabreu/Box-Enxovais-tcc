package handlers

import (
	"backend/src/services"
	"bytes"
	"encoding/json"
	"image"
	"image/jpeg"
	"image/png"
	"mime/multipart"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"
)

func promotionImageBytes(t *testing.T, format string) []byte {
	t.Helper()
	var data bytes.Buffer
	picture := image.NewRGBA(image.Rect(0, 0, 2, 2))
	var err error
	switch format {
	case "png":
		err = png.Encode(&data, picture)
	case "jpeg":
		err = jpeg.Encode(&data, picture, nil)
	default:
		t.Fatalf("formato de teste desconhecido: %s", format)
	}
	if err != nil {
		t.Fatal(err)
	}
	return data.Bytes()
}

func promotionUploadRequest(t *testing.T, filename string, content []byte, attach bool) *http.Request {
	t.Helper()
	var body bytes.Buffer
	writer := multipart.NewWriter(&body)
	if attach {
		part, err := writer.CreateFormFile("image", filename)
		if err != nil {
			t.Fatal(err)
		}
		if _, err := part.Write(content); err != nil {
			t.Fatal(err)
		}
	}
	if err := writer.Close(); err != nil {
		t.Fatal(err)
	}
	req := httptest.NewRequest(http.MethodPost, "/admin/promotions/image", &body)
	req.Header.Set("Content-Type", writer.FormDataContentType())
	return req
}

func TestPromotionUploadImage(t *testing.T) {
	pngData := promotionImageBytes(t, "png")
	jpegData := promotionImageBytes(t, "jpeg")
	tests := []struct {
		name       string
		filename   string
		content    []byte
		attach     bool
		wantStatus int
		wantExt    string
	}{
		{name: "PNG válido", filename: "campanha.png", content: pngData, attach: true, wantStatus: http.StatusCreated, wantExt: ".png"},
		{name: "JPEG válido", filename: "campanha.jpeg", content: jpegData, attach: true, wantStatus: http.StatusCreated, wantExt: ".jpg"},
		{name: "Extensão não substitui MIME", filename: "campanha.png", content: []byte("não é uma imagem"), attach: true, wantStatus: http.StatusUnsupportedMediaType},
		{name: "Imagem vazia", filename: "campanha.png", content: []byte{}, attach: true, wantStatus: http.StatusBadRequest},
		{name: "Imagem ausente", attach: false, wantStatus: http.StatusBadRequest},
		{name: "Imagem acima de 10 MiB", filename: "campanha.png", content: bytes.Repeat([]byte("x"), (10<<20)+1), attach: true, wantStatus: http.StatusBadRequest},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			handler := PromotionHandler{Service: services.PromotionService{UploadDir: dir}}
			response := httptest.NewRecorder()
			handler.UploadImage(response, promotionUploadRequest(t, tc.filename, tc.content, tc.attach))

			if response.Code != tc.wantStatus {
				t.Fatalf("status = %d, esperado %d, resposta: %s", response.Code, tc.wantStatus, response.Body.String())
			}

			entries, err := os.ReadDir(dir)
			if err != nil {
				t.Fatal(err)
			}
			if tc.wantStatus != http.StatusCreated {
				if len(entries) != 0 {
					t.Fatalf("upload rejeitado criou %d arquivos", len(entries))
				}
				return
			}

			var result struct {
				ImagePath string `json:"image_path"`
			}
			if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
				t.Fatal(err)
			}
			if !strings.HasPrefix(result.ImagePath, "uploads/campaign_") || filepath.Ext(result.ImagePath) != tc.wantExt {
				t.Fatalf("caminho público inesperado: %q", result.ImagePath)
			}
			if len(entries) != 1 || entries[0].Name() != filepath.Base(result.ImagePath) {
				t.Fatalf("arquivo salvo não corresponde ao caminho público: %q", result.ImagePath)
			}
			saved, err := os.ReadFile(filepath.Join(dir, entries[0].Name()))
			if err != nil {
				t.Fatal(err)
			}
			if !bytes.Equal(saved, tc.content) {
				t.Fatal("conteúdo salvo difere da imagem enviada")
			}
		})
	}
}
