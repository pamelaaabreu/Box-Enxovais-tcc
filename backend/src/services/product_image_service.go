package services

import (
	"backend/src/repositories"
	"context"
	"errors"
	"fmt"
	"io"
	"os"
	"path/filepath"
	"time"
)

var ErrImageCreate = errors.New("image file creation failed")
var ErrImageWrite = errors.New("image file write failed")
var ErrImageRecord = errors.New("image registration failed")

type ProductImageService struct {
	Store     repositories.ProductImageRepository
	Directory string
}

func (service ProductImageService) Upload(ctx context.Context, productID int, filename string, source io.Reader, variantID ...*int64) (string, error) {
	path, err := SaveImageAsset(service.Directory, fmt.Sprint(productID), filename, source)
	if err != nil {
		return "", err
	}
	publicPath := "uploads/" + filepath.Base(path)
	if err := service.Store.Create(ctx, productID, publicPath, variantID...); err != nil {
		return "", errors.Join(ErrImageRecord, err, os.Remove(path))
	}
	return publicPath, nil
}

func SaveImageAsset(directory, prefix, filename string, source io.Reader) (string, error) {
	if err := os.MkdirAll(directory, os.ModePerm); err != nil {
		return "", errors.Join(ErrImageCreate, err)
	}
	name := fmt.Sprintf("%s_%d%s", prefix, time.Now().UnixNano(), filepath.Ext(filename))
	path := filepath.Join(directory, name)
	destination, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0666)
	if err != nil {
		return "", errors.Join(ErrImageCreate, err)
	}
	_, copyErr := io.Copy(destination, source)
	closeErr := destination.Close()
	if err := errors.Join(copyErr, closeErr); err != nil {
		return "", errors.Join(ErrImageWrite, err, os.Remove(path))
	}
	return path, nil
}
