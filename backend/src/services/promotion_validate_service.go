package services

import (
	"backend/src/models"
	"context"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode/utf8"
)

func (service PromotionService) validate(ctx context.Context, request models.CreatePromotionRequest) (models.CreatePromotionRequest, error) {
	request.Name = strings.TrimSpace(request.Name)
	request.Description = strings.TrimSpace(request.Description)
	if request.Name == "" || utf8.RuneCountInString(request.Name) > 255 || (request.Status != "active" && request.Status != "inactive") || utf8.RuneCountInString(request.Description) > 2000 {
		return request, ErrPromotionInvalid
	}
	loc, e := time.LoadLocation("America/Sao_Paulo")
	if e != nil {
		return request, e
	}
	parse := func(s string) (time.Time, error) {
		v, e := time.Parse(time.RFC3339, s)
		if e == nil {
			return v, nil
		}
		return time.ParseInLocation("2006-01-02T15:04", s, loc)
	}
	start, e := parse(request.StartDate)
	if e != nil {
		return request, ErrPromotionInvalid
	}
	end, e := parse(request.EndDate)
	if e != nil || !end.After(start) {
		return request, ErrPromotionInvalid
	}
	request.StartDate = start.Format(time.RFC3339)
	request.EndDate = end.Format(time.RFC3339)
	if request.HomeFeatured && (request.Description == "" || request.ImagePath == "") {
		return request, ErrPromotionInvalid
	}
	if request.ImagePath != "" {
		if !strings.HasPrefix(request.ImagePath, "uploads/") {
			return request, ErrPromotionInvalid
		}
		name := strings.TrimPrefix(request.ImagePath, "uploads/")
		ext := strings.ToLower(filepath.Ext(name))
		if (ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".webp") || name != filepath.Base(name) || strings.ContainsAny(name, "\\?#") {
			return request, ErrPromotionInvalid
		}
		dir := service.UploadDir
		if dir == "" {
			dir = "uploads"
		}
		info, e := os.Stat(filepath.Join(dir, name))
		if e != nil || !info.Mode().IsRegular() {
			return request, ErrPromotionInvalid
		}
		f, e := os.Open(filepath.Join(dir, name))
		if e != nil {
			return request, ErrPromotionInvalid
		}
		header := make([]byte, 512)
		n, _ := f.Read(header)
		f.Close()
		mime := http.DetectContentType(header[:n])
		if mime != "image/png" && mime != "image/jpeg" && mime != "image/webp" {
			return request, ErrPromotionInvalid
		}
	}
	return request, nil
}
