package services

import (
	"bytes"
	"context"
	"errors"
	"fmt"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"regexp"
	"strings"
	"time"

	"backend/src/repositories"
)

const MaxImageBytes = 10 << 20

var assetPrefix = regexp.MustCompile(`^[A-Za-z0-9_-]+$`)
var ErrImageContent = errors.New("Selecione uma imagem JPEG, PNG ou WebP de até 10 MB.")
var ErrImageCreate = errors.New("image file creation failed")
var ErrImageWrite = errors.New("image file write failed")
var ErrImageRecord = errors.New("image registration failed")

type ProductImageService struct {
	Store     repositories.ProductImageRepository
	Directory string
}

func (service ProductImageService) Upload(ctx context.Context, productID int, filename string, source io.Reader, variantID ...*int64) (string, error) {

	// Salva fisicamente a imagem no servidor.
	path, err := SaveImageAsset(
		service.Directory,
		fmt.Sprint(productID),
		filename,
		source,
	)

	if err != nil {
		return "", err
	}

	// Define o caminho público utilizado pelo frontend.
	publicPath := "uploads/" + filepath.Base(path)

	// Registra o caminho da imagem no banco.
	if err := service.Store.Create(ctx, productID, publicPath, variantID...); err != nil {

		// Tenta remover o arquivo caso o registro falhe.
		return "", errors.Join(ErrImageRecord, err, os.Remove(path))
	}

	return publicPath, nil
}

func SaveImageAsset(directory, prefix, filename string, source io.Reader) (string, error) {

	if source == nil || !assetPrefix.MatchString(prefix) {
		return "", ErrImageContent
	}
	header := make([]byte, 512)
	n, readErr := io.ReadFull(source, header)
	if readErr != nil && !errors.Is(readErr, io.EOF) && !errors.Is(readErr, io.ErrUnexpectedEOF) {
		return "", errors.Join(ErrImageWrite, readErr)
	}
	if !validImageContent(filename, header[:n]) {
		return "", ErrImageContent
	}
	source = io.MultiReader(bytes.NewReader(header[:n]), source)
	// Cria o diretório caso ainda não exista.
	if err := os.MkdirAll(directory, 0750); err != nil {
		return "", errors.Join(ErrImageCreate, err)
	}

	// Gera um nome utilizando o prefixo, o timestamp
	// e a extensão original do arquivo.
	name := fmt.Sprintf(
		"%s_%d%s",
		prefix,
		time.Now().UnixNano(),
		filepath.Ext(filename),
	)

	path := filepath.Join(directory, name)

	// Cria o arquivo sem sobrescrever arquivos existentes.
	destination, err := os.OpenFile(
		path,
		os.O_WRONLY|os.O_CREATE|os.O_EXCL,
		0640,
	)

	if err != nil {
		return "", errors.Join(ErrImageCreate, err)
	}

	// Copia os dados recebidos para o arquivo físico.
	written, copyErr := io.Copy(destination, io.LimitReader(source, MaxImageBytes+1))
	if written > MaxImageBytes {
		copyErr = ErrImageContent
	}

	// Fecha o arquivo e verifica possíveis erros.
	closeErr := destination.Close()

	if err := errors.Join(copyErr, closeErr); err != nil {
		return "", errors.Join(ErrImageWrite, err, os.Remove(path))
	}

	return path, nil
}

func validImageContent(filename string, header []byte) bool {
	ext := strings.ToLower(filepath.Ext(filename))
	mime := http.DetectContentType(header)
	return (mime == "image/png" && ext == ".png") || (mime == "image/jpeg" && (ext == ".jpg" || ext == ".jpeg")) || (mime == "image/webp" && ext == ".webp")
}
