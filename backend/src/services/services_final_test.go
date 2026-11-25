package services

import (
	"bytes"
	"context"
	"errors"
	"image"
	"image/png"
	"io"
	"math"
	"net/url"
	"os"
	"path/filepath"
	"reflect"
	"strings"
	"testing"

	"backend/src/models"
	"gopkg.in/gomail.v2"
)

func TestPasswordRulesShared(t *testing.T) {
	for _, tc := range []struct {
		name, password string
		valid          bool
	}{
		{"ascii", "Senha1@x", true}, {"utf16", "Aa1@😀😀", true},
		{"uppercase unicode only", "Áaaaa1@x", false}, {"number unicode only", "Abcdef@١", false},
		{"wrong symbol", "Abcdef1!", false}, {"bcrypt boundary", "Aa1@" + strings.Repeat("x", 68), true},
		{"bcrypt overflow", "Aa1@" + strings.Repeat("x", 69), false},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if isStrongPassword(tc.password) != tc.valid || isStrongResetPassword(tc.password) != tc.valid {
				t.Fatal("registration/reset mismatch")
			}
		})
	}
}

func TestNewsletterPersistenceAndIdempotency(t *testing.T) {
	t.Setenv("EMAIL", "store@example.invalid")
	store := &newsletterFakeStore{err: errors.New("database unavailable")}
	calls := 0
	service := NewsletterService{Store: store, Send: func(*gomail.Message) error { calls++; return nil }}
	if err := service.Subscribe(context.Background(), "person@example.invalid"); !errors.Is(err, ErrNewsletterPersistence) || calls != 0 {
		t.Fatal("database failure must prevent SMTP")
	}
	store.err = nil
	for i := 0; i < 2; i++ {
		if err := service.Subscribe(context.Background(), " PERSON@EXAMPLE.INVALID "); err != nil {
			t.Fatal(err)
		}
	}
	if calls != 1 {
		t.Fatalf("duplicate welcome: %d", calls)
	}
	if err := service.Subscribe(context.Background(), "Display <person@example.invalid>"); !errors.Is(err, ErrNewsletterEmailInvalid) || calls != 1 {
		t.Fatal("invalid email accepted")
	}
}

func TestServicePaginationAndFilters(t *testing.T) {
	for _, page := range []int{0, -1, math.MaxInt} {
		if _, err := customerOffset(page); err == nil {
			t.Fatalf("invalid page %d", page)
		}
	}
	if offset, err := customerOffset(2); err != nil || offset != 10 {
		t.Fatal("pagination changed")
	}
	query := url.Values{"sort": {"price_asc"}, "name__contains": {"Toalha"}}
	original := url.Values{"sort": {"price_asc"}, "name__contains": {"Toalha"}}
	if result, err := (ProductService{}).ParsePage(query, false); err != nil || result.Order == "" {
		t.Fatal(err)
	}
	if !reflect.DeepEqual(query, original) {
		t.Fatal("caller filters mutated")
	}
	if _, err := (ProductService{}).ParsePage(url.Values{"page": {"invalid"}}, false); err == nil {
		t.Fatal("invalid pagination ignored")
	}
	if _, _, valid := ValidateShippingRange(nil); valid {
		t.Fatal("nil range accepted")
	}
}

func TestProductServiceSharedValidation(t *testing.T) {
	category := 1
	quantity := int32(1)
	base := models.Product{Name: "Produto", ProductTypeID: &category, Price: 10, Status: "active"}
	for _, tc := range []struct {
		name   string
		mutate func(*models.Product)
	}{
		{"name", func(p *models.Product) { p.Name = "" }}, {"category", func(p *models.Product) { p.ProductTypeID = nil }},
		{"price", func(p *models.Product) { p.Price = math.NaN() }}, {"status", func(p *models.Product) { p.Status = "invalid" }},
		{"measurement NUL", func(p *models.Product) { p.Measurements = map[string]string{"Cor": "a\x00b"} }},
	} {
		t.Run(tc.name, func(t *testing.T) {
			product := base
			tc.mutate(&product)
			if _, err := (ProductService{}).Create(context.Background(), product, &quantity); !errors.Is(err, ErrProductDetails) {
				t.Fatalf("validation: %v", err)
			}
		})
	}
	variants := []models.ProductVariant{{Size: " Casal ", Dimensions: " 220 x 240 cm ", Price: 10, Stock: 1}}
	normalized := normalizeVariants(variants)
	if normalized[0].Size != "Casal" || variants[0].Size != " Casal " {
		t.Fatal("normalization mutated input")
	}
	for _, tc := range []struct {
		name  string
		items []models.ProductVariant
	}{
		{"stock overflow", []models.ProductVariant{{Size: "Casal", Dimensions: "x", Price: 10, Stock: math.MaxInt32}, {Size: "Queen", Dimensions: "x", Price: 10, Stock: 1}}},
		{"metadata NUL", []models.ProductVariant{{Size: "Casal", Dimensions: "x", Price: 10, IncludedItems: []string{"a\x00b"}}}},
		{"duplicate normalized", append(normalized, models.ProductVariant{Size: " casal ", Dimensions: "x", Price: 10})},
	} {
		t.Run(tc.name, func(t *testing.T) {
			if err := validateVariants(tc.items, false); !errors.Is(err, ErrProductVariants) {
				t.Fatal("invalid variants accepted")
			}
		})
	}
}

type failedImageReader struct{}

func (failedImageReader) Read([]byte) (int, error) { return 0, io.ErrClosedPipe }

func TestImageAssetSafety(t *testing.T) {
	var imageData bytes.Buffer
	if err := png.Encode(&imageData, image.NewRGBA(image.Rect(0, 0, 2, 2))); err != nil {
		t.Fatal(err)
	}
	for _, tc := range []struct {
		name, prefix, filename string
		source                 func() io.Reader
		want                   error
	}{
		{"short PNG", "product", "image.png", func() io.Reader { return bytes.NewReader(imageData.Bytes()) }, nil},
		{"unsafe prefix", "../product", "image.png", func() io.Reader { return bytes.NewReader(imageData.Bytes()) }, ErrImageContent},
		{"extension mismatch", "product", "image.jpg", func() io.Reader { return bytes.NewReader(imageData.Bytes()) }, ErrImageContent},
		{"read error", "product", "image.png", func() io.Reader { return failedImageReader{} }, ErrImageWrite},
		{"too large", "product", "image.png", func() io.Reader {
			return io.MultiReader(bytes.NewReader(imageData.Bytes()), bytes.NewReader(make([]byte, MaxImageBytes)))
		}, ErrImageContent},
		{"nonimage", "product", "image.png", func() io.Reader { return strings.NewReader("plain text") }, ErrImageContent},
	} {
		t.Run(tc.name, func(t *testing.T) {
			dir := t.TempDir()
			path, err := SaveImageAsset(dir, tc.prefix, tc.filename, tc.source())
			if tc.want != nil {
				if !errors.Is(err, tc.want) {
					t.Fatalf("error=%v", err)
				}
				files, _ := os.ReadDir(dir)
				if len(files) != 0 {
					t.Fatal("partial file retained")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			if filepath.Dir(path) != dir {
				t.Fatal("escaped upload directory")
			}
			saved, err := os.ReadFile(path)
			if err != nil || !bytes.Equal(saved, imageData.Bytes()) {
				t.Fatal("image changed")
			}
		})
	}
}
