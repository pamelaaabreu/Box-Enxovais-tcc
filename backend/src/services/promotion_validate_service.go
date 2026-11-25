package services

import (
	"context"
	"errors"
	"io"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode/utf8"

	"backend/src/models"
)

func (service PromotionService) validate(ctx context.Context, request models.CreatePromotionRequest) (models.CreatePromotionRequest, error) {

	// Normaliza os campos textuais.
	request.Name = strings.TrimSpace(request.Name)
	request.Description = strings.TrimSpace(request.Description)

	// Valida os dados gerais da campanha.
	if request.Name == "" ||
		utf8.RuneCountInString(request.Name) > 255 ||
		(request.Status != "active" && request.Status != "inactive") ||
		utf8.RuneCountInString(request.Description) > 2000 {

		return request, ErrPromotionInvalid
	}

	// Carrega o fuso horário brasileiro.
	loc, e := time.LoadLocation("America/Sao_Paulo")

	if e != nil {
		return request, e
	}

	// Aceita dois formatos de data.
	parse := func(s string) (time.Time, error) {

		v, e := time.Parse(time.RFC3339, s)

		if e == nil {
			return v, nil
		}

		return time.ParseInLocation(
			"2006-01-02T15:04",
			s,
			loc,
		)
	}

	// Valida a data inicial.
	start, e := parse(request.StartDate)

	if e != nil {
		return request, ErrPromotionInvalid
	}

	// Valida a data final e a ordem cronológica.
	end, e := parse(request.EndDate)

	if e != nil || !end.After(start) {
		return request, ErrPromotionInvalid
	}

	// Padroniza as datas.
	request.StartDate = start.Format(time.RFC3339)
	request.EndDate = end.Format(time.RFC3339)

	// Campanhas destacadas na Home precisam
	// possuir descrição e imagem.
	if request.HomeFeatured &&
		request.Description == "" {

		return request, ErrPromotionInvalid
	}

	if request.ImagePath != "" {

		// Exige que a imagem esteja associada
		// ao diretório de uploads.
		if !strings.HasPrefix(request.ImagePath, "uploads/") {
			return request, ErrPromotionInvalid
		}

		name := strings.TrimPrefix(request.ImagePath, "uploads/")
		ext := strings.ToLower(filepath.Ext(name))

		// Valida a extensão e impede caminhos indevidos.
		if (ext != ".png" &&
			ext != ".jpg" &&
			ext != ".jpeg" &&
			ext != ".webp") ||
			name != filepath.Base(name) ||
			strings.ContainsAny(name, "\\?#") {

			return request, ErrPromotionInvalid
		}

		// Utiliza o diretório configurado ou o padrão.
		dir := service.UploadDir

		if dir == "" {
			dir = "uploads"
		}

		// Verifica se o arquivo existe e é regular.
		info, e := os.Stat(filepath.Join(dir, name))

		if e != nil || !info.Mode().IsRegular() {
			return request, ErrPromotionInvalid
		}

		// Abre o arquivo para verificar seu conteúdo.
		f, e := os.Open(filepath.Join(dir, name))

		if e != nil {
			return request, ErrPromotionInvalid
		}

		// Lê os primeiros 512 bytes.
		header := make([]byte, 512)

		n, readErr := io.ReadFull(f, header)
		closeErr := f.Close()
		if closeErr != nil || (readErr != nil && !errors.Is(readErr, io.EOF) && !errors.Is(readErr, io.ErrUnexpectedEOF)) {
			return request, ErrPromotionInvalid
		}

		if info.Size() > MaxImageBytes || !validImageContent(name, header[:n]) {
			return request, ErrPromotionInvalid
		}
	}

	return request, nil
}
