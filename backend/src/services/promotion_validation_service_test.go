package services

import (
	"backend/src/models"
	"bytes"
	"context"
	"errors"
	"image"
	"image/png"
	"os"
	"path/filepath"
	"testing"
)

func TestPromotionValidateCampaignImage(t *testing.T) {
	dir := t.TempDir()
	var picture bytes.Buffer
	if err := png.Encode(&picture, image.NewRGBA(image.Rect(0, 0, 2, 2))); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "banner.png"), picture.Bytes(), 0600); err != nil {
		t.Fatal(err)
	}
	if err := os.WriteFile(filepath.Join(dir, "falso.png"), []byte("conteúdo de texto"), 0600); err != nil {
		t.Fatal(err)
	}

	service := PromotionService{UploadDir: dir}
	base := models.CreatePromotionRequest{
		Name:         "Campanha de Natal",
		Description:  "Produtos em destaque",
		Status:       "active",
		StartDate:    "2026-12-01T08:00:00-03:00",
		EndDate:      "2026-12-25T23:59:00-03:00",
		HomeFeatured: true,
	}

	tests := []struct {
		name      string
		imagePath string
		wantError bool
	}{
		{name: "Imagem válida", imagePath: "uploads/banner.png"},
		{name: "Imagem ausente permite fallback validado na transação", imagePath: "", wantError: false},
		{name: "Arquivo não encontrado", imagePath: "uploads/inexistente.png", wantError: true},
		{name: "Falso PNG", imagePath: "uploads/falso.png", wantError: true},
		{name: "Caminho externo", imagePath: "https://example.com/banner.png", wantError: true},
		{name: "Caminho relativo indevido", imagePath: "uploads/../banner.png", wantError: true},
		{name: "Extensão não permitida", imagePath: "uploads/banner.svg", wantError: true},
	}

	for _, tc := range tests {
		t.Run(tc.name, func(t *testing.T) {
			request := base
			request.ImagePath = tc.imagePath
			result, err := service.validate(context.Background(), request)
			if tc.wantError {
				if !errors.Is(err, ErrPromotionInvalid) {
					t.Fatalf("esperado ErrPromotionInvalid, recebido %v", err)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if result.ImagePath != tc.imagePath {
				t.Fatalf("caminho alterado: %q", result.ImagePath)
			}
		})
	}
}
