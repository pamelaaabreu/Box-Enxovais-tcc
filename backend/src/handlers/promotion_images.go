package handlers

import (
	"backend/src/response"
	"backend/src/services"
	"net/http"
	"path/filepath"
)

func (h PromotionHandler) UploadImage(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodPost) {
		return
	}

	defer cleanupMultipart(r)
	file, ext, err := imageUpload(w, r)
	if err != nil {
		imageUploadError(w, err)
		return
	}
	defer closeImage(file)
	// Define o diretório de armazenamento.
	directory := h.Service.UploadDir

	if directory == "" {
		directory = "uploads"
	}

	// Salva fisicamente a imagem.
	path, err := services.SaveImageAsset(
		directory,
		"campaign",
		"image"+ext,
		file,
	)

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Não foi possível salvar a imagem.")
		return
	}

	// Retorna o caminho utilizado pelo frontend.
	response.JSON(w, http.StatusCreated, map[string]string{
		"image_path": "uploads/" + filepath.Base(path),
	})
}
