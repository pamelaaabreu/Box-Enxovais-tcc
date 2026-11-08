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

func (service ProductImageService) Upload(ctx context.Context, productID int, filename string, source io.Reader) (string, error) {
	if err := os.MkdirAll(service.Directory, os.ModePerm); err != nil {
		return "", errors.Join(ErrImageCreate, err)
	}
	name := fmt.Sprintf("%d_%d%s", productID, time.Now().UnixNano(), filepath.Ext(filename))
	path := filepath.Join(service.Directory, name)
	destination, err := os.OpenFile(path, os.O_WRONLY|os.O_CREATE|os.O_EXCL, 0666)
	if err != nil {
		return "", errors.Join(ErrImageCreate, err)
	}
	_, copyErr := io.Copy(destination, source)
	closeErr := destination.Close()
	if err := errors.Join(copyErr, closeErr); err != nil {
		return "", errors.Join(ErrImageWrite, err, os.Remove(path))
	}
	if err := service.Store.Create(ctx, productID, path); err != nil {
		return "", errors.Join(ErrImageRecord, err, os.Remove(path))
	}
	return path, nil
}
