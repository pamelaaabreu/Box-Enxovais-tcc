package services

import (
	"backend/src/models"
	"backend/src/repositories"
	"context"
	"strings"
	"time"
	"unicode/utf8"
)

func (service ProductService) Remove(ctx context.Context, id int64) (string, error) {
	return service.Store.Remove(ctx, id)
}
func (service ProductService) ListBrands(ctx context.Context) ([]models.ProductType, error) {
	return service.Store.ListBrands(ctx)
}
func (service ProductService) ListRelated(ctx context.Context, id int64) ([]models.Product, error) {
	return service.Store.ListRelated(ctx, id)
}
func (service ProductService) Dashboard(ctx context.Context, periods ...models.DashboardPeriod) (models.Dashboard, error) {
	return service.Store.Dashboard(ctx, periods...)
}
func (service ProductService) Report(ctx context.Context, filter models.ReportFilter) (models.Report, error) {
	return service.Store.Report(ctx, filter)
}
func (service ProductService) ListRegistrations(ctx context.Context, kind repositories.CatalogKind) ([]models.CatalogRegistration, error) {
	return service.Store.ListRegistrations(ctx, kind)
}
func (service ProductService) SaveRegistration(ctx context.Context, kind repositories.CatalogKind, id int, name string) (models.ProductType, error) {
	name = strings.Join(strings.Fields(name), " ")
	if name == "" || utf8.RuneCountInString(name) > 100 || strings.ContainsRune(name, 0) {
		return models.ProductType{}, ValidationError("Informe um nome de até 100 caracteres")
	}
	return service.Store.SaveRegistration(ctx, kind, id, name)
}
func (service ProductService) DeleteRegistration(ctx context.Context, kind repositories.CatalogKind, id int) error {
	return service.Store.DeleteRegistration(ctx, kind, id)
}
func (service ProductImageService) List(ctx context.Context, productID int64) ([]models.ProductImage, error) {
	return service.Store.List(ctx, productID)
}
func (service ProductImageService) Reorder(ctx context.Context, productID int64, order models.ProductImageOrder) error {
	return service.Store.Reorder(ctx, productID, order)
}
func (service ProductImageService) Remove(ctx context.Context, productID int64, imageID int64) error {
	return service.Store.Remove(ctx, productID, imageID)
}
func (service ProductReviewService) Mine(ctx context.Context, userID int) ([]models.ProductReview, error) {
	return service.Store.Mine(ctx, userID)
}
func (service ProductReviewService) Reviewable(ctx context.Context, userID int) ([]models.ReviewableProduct, error) {
	return service.Store.Reviewable(ctx, userID)
}
func (service ProductReviewService) Public(ctx context.Context, productID int64, home bool) ([]models.ProductReview, error) {
	return service.Store.Public(ctx, productID, home)
}
func (service ProductReviewService) Summaries(ctx context.Context, ids []int64) (map[int64]models.ProductReviewSummary, error) {
	return service.Store.Summaries(ctx, ids)
}
func (service ProductReviewService) Admin(ctx context.Context) ([]models.ProductReview, error) {
	return service.Store.Admin(ctx)
}
func (service ProductReviewService) Moderate(ctx context.Context, id int64, moderatorID int, status string, expected time.Time) error {
	return service.Store.Moderate(ctx, id, moderatorID, status, expected)
}
func (service PromotionService) ListCampaigns(ctx context.Context) ([]models.PromotionRecord, error) {
	return service.Store.ListCampaigns(ctx)
}
func (service FavoritesService) Add(ctx context.Context, userID int, productID int64) error {
	return service.Store.Add(ctx, userID, productID)
}
func (service FavoritesService) Remove(ctx context.Context, userID int, productID int64) error {
	return service.Store.Remove(ctx, userID, productID)
}
