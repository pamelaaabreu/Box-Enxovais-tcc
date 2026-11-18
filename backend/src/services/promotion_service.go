package services

import (
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"database/sql"
	"errors"
	"math"
	"net/http"
	"os"
	"path/filepath"
	"strings"
	"time"
	"unicode/utf8"
)

var ErrPromotionInvalid = errors.New("Confira o nome, período e imagem da campanha; o desconto deve ser menor que o preço e não se aplica a variantes.")
var ErrPromotionNotFound = errors.New("promotion not found")
var ErrPromotionLookup = errors.New("promotion lookup failed")

type PromotionService struct {
	Store     repositories.PromotionRepository
	UploadDir string
}

func (service PromotionService) Create(ctx context.Context, request models.CreatePromotionRequest) (int, error) {
	request.Name = strings.TrimSpace(request.Name)
	request.Description = strings.TrimSpace(request.Description)
	if request.Name == "" || utf8.RuneCountInString(request.Name) > 255 || (request.Status != "active" && request.Status != "inactive") || utf8.RuneCountInString(request.Description) > 2000 {
		return 0, ErrPromotionInvalid
	}
	loc, e := time.LoadLocation("America/Sao_Paulo")
	if e != nil {
		return 0, e
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
		return 0, ErrPromotionInvalid
	}
	end, e := parse(request.EndDate)
	if e != nil || !end.After(start) {
		return 0, ErrPromotionInvalid
	}
	request.StartDate = start.Format(time.RFC3339)
	request.EndDate = end.Format(time.RFC3339)
	if request.HomeFeatured && (request.Description == "" || request.ImagePath == "") {
		return 0, ErrPromotionInvalid
	}
	if request.ImagePath != "" {
		if !strings.HasPrefix(request.ImagePath, "uploads/") {
			return 0, ErrPromotionInvalid
		}
		name := strings.TrimPrefix(request.ImagePath, "uploads/")
		ext := strings.ToLower(filepath.Ext(name))
		if (ext != ".png" && ext != ".jpg" && ext != ".jpeg" && ext != ".webp") || name != filepath.Base(name) || strings.ContainsAny(name, "\\?#") {
			return 0, ErrPromotionInvalid
		}
		dir := service.UploadDir
		if dir == "" {
			dir = "uploads"
		}
		info, e := os.Stat(filepath.Join(dir, name))
		if e != nil || !info.Mode().IsRegular() {
			return 0, ErrPromotionInvalid
		}
		f, e := os.Open(filepath.Join(dir, name))
		if e != nil {
			return 0, ErrPromotionInvalid
		}
		header := make([]byte, 512)
		n, _ := f.Read(header)
		f.Close()
		mime := http.DetectContentType(header[:n])
		if mime != "image/png" && mime != "image/jpeg" && mime != "image/webp" {
			return 0, ErrPromotionInvalid
		}
	}
	return service.Store.Create(ctx, request)
}

func (service PromotionService) AddProduct(ctx context.Context, request models.AddToPromotionRequest) error {
	if request.ProductID <= 0 || math.IsNaN(request.PromotionalPrice) || math.IsInf(request.PromotionalPrice, 0) || request.PromotionalPrice < 0 {
		return ErrPromotionInvalid
	}
	var price float64
	var variants bool
	if e := service.Store.DB.QueryRowContext(ctx, "SELECT price,EXISTS(SELECT 1 FROM product_variants v WHERE v.product_id=p.id) FROM products p WHERE id=$1 AND status='active'", request.ProductID).Scan(&price, &variants); e != nil {
		return ErrPromotionInvalid
	}
	if variants || request.PromotionalPrice >= price {
		return ErrPromotionInvalid
	}
	id, err := service.Store.FindActiveID(ctx, request.PromotionName)
	if errors.Is(err, sql.ErrNoRows) {
		return ErrPromotionNotFound
	}
	if err != nil {
		return errors.Join(ErrPromotionLookup, err)
	}
	return service.Store.AddProduct(ctx, id, request)
}
