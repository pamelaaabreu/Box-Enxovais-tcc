package handlers

import (
	"backend/src/response"
	"backend/src/services"
	"errors"
	"image"
	_ "image/jpeg"
	_ "image/png"
	"io"
	"log"
	"mime/multipart"
	"net/http"
)

const maximumImagePixels = 24_000_000

var errMissingImage = errors.New("missing image")
var errImageTooLarge = errors.New("image size")
var errImageFormat = errors.New("image format")
var errImageRead = errors.New("image read")

func cleanupMultipart(r *http.Request) {
	if r.MultipartForm != nil {
		if err := r.MultipartForm.RemoveAll(); err != nil {
			log.Println("Falha ao remover temporários multipart")
		}
	}
}

func imageUpload(w http.ResponseWriter, r *http.Request) (multipart.File, string, error) {
	r.Body = http.MaxBytesReader(w, r.Body, services.MaxImageBytes+(64<<10))
	if err := r.ParseMultipartForm(services.MaxImageBytes); err != nil {
		return nil, "", err
	}
	file, header, err := r.FormFile("image")
	if err != nil {
		return nil, "", errMissingImage
	}
	fail := func(reason error) (multipart.File, string, error) { closeImage(file); return nil, "", reason }
	if header.Size <= 0 {
		return fail(errMissingImage)
	}
	if header.Size > services.MaxImageBytes {
		return fail(errImageTooLarge)
	}
	var sample [512]byte
	n, err := io.ReadFull(file, sample[:])
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) && !errors.Is(err, io.EOF) {
		return fail(errImageRead)
	}
	extension := map[string]string{"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}[http.DetectContentType(sample[:n])]
	if extension == "" {
		return fail(errImageFormat)
	}
	if _, err = file.Seek(0, io.SeekStart); err != nil {
		return fail(errImageRead)
	}
	// PNG/JPEG possuem decoders na biblioteca padrão; limite antes de alocar pixels.
	if extension != ".webp" {
		config, _, err := image.DecodeConfig(file)
		if err != nil || config.Width <= 0 || config.Height <= 0 || int64(config.Width)*int64(config.Height) > maximumImagePixels {
			return fail(errImageFormat)
		}
		if _, err = file.Seek(0, io.SeekStart); err != nil {
			return fail(errImageRead)
		}
		if _, _, err = image.Decode(file); err != nil {
			return fail(errImageFormat)
		}
	}
	if _, err = file.Seek(0, io.SeekStart); err != nil {
		return fail(errImageRead)
	}
	return file, extension, nil
}
func imageUploadError(w http.ResponseWriter, err error) {
	status := http.StatusBadRequest
	message := "Formulário ou imagem inválidos. Envie uma imagem de até 10 MB."
	var maximum *http.MaxBytesError
	if errors.As(err, &maximum) {
		status = http.StatusRequestEntityTooLarge
	}
	if errors.Is(err, errImageFormat) {
		status = http.StatusUnsupportedMediaType
		message = "Selecione uma imagem JPEG, PNG ou WebP válida."
	}
	if errors.Is(err, errImageRead) {
		message = "Não foi possível ler a imagem."
	}
	response.Error(w, status, message)
}

func closeImage(file multipart.File) {
	if err := file.Close(); err != nil {
		log.Println("Falha ao fechar imagem recebida")
	}
}
