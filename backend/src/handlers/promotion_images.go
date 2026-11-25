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
	if !allowMethods(w, r, http.MethodPost) {
		return
	}

	// Limita a imagem a 10 MiB.
	const maximum = 10 << 20

	r.Body = http.MaxBytesReader(w, r.Body, maximum+(64<<10))

	// Processa o formulário multipart.
	if r.ParseMultipartForm(maximum) != nil {
		response.Error(w, 400, "Selecione uma imagem de até 10 MB.")
		return
	}

	defer r.MultipartForm.RemoveAll()

	// Recupera o arquivo enviado.
	file, header, err := r.FormFile("image")

	if err != nil {
		response.Error(w, 400, "Selecione uma imagem.")
		return
	}

	defer file.Close()

	// Valida o tamanho do arquivo.
	if header.Size <= 0 || header.Size > maximum {
		response.Error(w, 400, "Selecione uma imagem de até 10 MB.")
		return
	}

	// Inspeciona os primeiros 512 bytes.
	var content [512]byte

	n, err := io.ReadFull(file, content[:])

	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) {
		response.Error(w, 400, "Não foi possível ler a imagem.")
		return
	}

	// Define a extensão conforme o conteúdo detectado.
	ext := map[string]string{
		"image/png":  ".png",
		"image/jpeg": ".jpg",
		"image/webp": ".webp",
	}[http.DetectContentType(content[:n])]

	if ext == "" {
		response.Error(w, 415, "Selecione uma imagem JPEG, PNG ou WebP.")
		return
	}

	// Retorna ao início do arquivo.
	if _, err = file.Seek(0, io.SeekStart); err != nil {
		response.Error(w, 400, "Não foi possível ler a imagem.")
		return
	}

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
		response.Error(w, 500, "Não foi possível salvar a imagem.")
		return
	}

	// Retorna o caminho utilizado pelo frontend.
	response.JSON(w, 201, map[string]string{
		"image_path": "uploads/" + filepath.Base(path),
	})
}
