package handlers

import (
	"backend/src/response"
	"backend/src/services"
	"errors"
	"io"
	"net/http"
	"path/filepath"
)

func (h PromotionHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	const maximum = 10 << 20
	r.Body = http.MaxBytesReader(w, r.Body, maximum+(64<<10))
	if r.ParseMultipartForm(maximum) != nil {
		response.Error(w, 400, "Selecione uma imagem de até 10 MB.")
		return
	}
	defer r.MultipartForm.RemoveAll()
	file, header, err := r.FormFile("image")
	if err != nil {
		response.Error(w, 400, "Selecione uma imagem.")
		return
	}
	defer file.Close()
	if header.Size <= 0 || header.Size > maximum {
		response.Error(w, 400, "Selecione uma imagem de até 10 MB.")
		return
	}
	var content [512]byte
	n, err := io.ReadFull(file, content[:])
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) {
		response.Error(w, 400, "Não foi possível ler a imagem.")
		return
	}
	ext := map[string]string{"image/png": ".png", "image/jpeg": ".jpg", "image/webp": ".webp"}[http.DetectContentType(content[:n])]
	if ext == "" {
		response.Error(w, 415, "Selecione uma imagem JPEG, PNG ou WebP.")
		return
	}
	if _, err = file.Seek(0, io.SeekStart); err != nil {
		response.Error(w, 400, "Não foi possível ler a imagem.")
		return
	}
	directory := h.Service.UploadDir
	if directory == "" {
		directory = "uploads"
	}
	path, err := services.SaveImageAsset(directory, "campaign", "image"+ext, file)
	if err != nil {
		response.Error(w, 500, "Não foi possível salvar a imagem.")
		return
	}
	response.JSON(w, 201, map[string]string{"image_path": "uploads/" + filepath.Base(path)})
}
