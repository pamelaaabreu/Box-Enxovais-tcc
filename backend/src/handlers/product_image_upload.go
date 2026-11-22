package handlers

import (
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/response"
	"backend/src/services"
	"database/sql"
	"errors"
	"io"
	"log"
	"net/http"
	"strconv"
)

type UploadResponse = models.UploadResponse

type ProductImageHandler struct{ Service services.ProductImageService }

func (h ProductImageHandler) UploadProductImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.Error(w, http.StatusMethodNotAllowed, "Método não permitido")
		return
	}

	const maxImageBytes = 10 << 20
	r.Body = http.MaxBytesReader(w, r.Body, maxImageBytes+(64<<10))
	if err := r.ParseMultipartForm(maxImageBytes); err != nil {
		response.Error(w, http.StatusBadRequest, "A imagem é muito grande. Limite de 10MB.")
		return
	}

	defer r.MultipartForm.RemoveAll()

	file, handler, err := r.FormFile("image")
	if err != nil {
		response.Error(w, http.StatusBadRequest, "Erro ao recuperar o arquivo do formulário")
		return
	}
	defer file.Close()

	productIdStr := r.FormValue("productId")
	if productIdStr == "" {
		response.Error(w, http.StatusBadRequest, "O ID do produto é obrigatório")
		return
	}

	productId, err := strconv.Atoi(productIdStr)
	if err != nil {
		response.Error(w, http.StatusBadRequest, "O ID do produto deve ser um número inteiro válido")
		return
	}

	if productId <= 0 || handler.Size <= 0 || handler.Size > maxImageBytes {
		response.Error(w, http.StatusBadRequest, "Produto ou tamanho da imagem inválido")
		return
	}
	var header [512]byte
	size, err := io.ReadFull(file, header[:])
	if err != nil && !errors.Is(err, io.ErrUnexpectedEOF) {
		response.Error(w, http.StatusBadRequest, "Não foi possível ler a imagem")
		return
	}
	extensions := map[string]string{"image/jpeg": ".jpg", "image/png": ".png", "image/webp": ".webp"}
	ext, valid := extensions[http.DetectContentType(header[:size])]
	if !valid {
		response.Error(w, http.StatusUnsupportedMediaType, "Selecione uma imagem JPEG, PNG ou WebP")
		return
	}
	if _, err := file.Seek(0, io.SeekStart); err != nil {
		response.Error(w, http.StatusBadRequest, "Não foi possível ler a imagem")
		return
	}
	var variantID *int64
	if raw := r.FormValue("variantId"); raw != "" {
		value, e := strconv.ParseInt(raw, 10, 64)
		if e != nil || value <= 0 {
			response.Error(w, 400, "Variação inválida.")
			return
		}
		variantID = &value
	}
	filePath, err := h.Service.Upload(r.Context(), productId, "image"+ext, file, variantID)
	if err != nil {
		if errors.Is(err, repositories.ErrImageConflict) || errors.Is(err, sql.ErrNoRows) {
			adminProductError(w, err)
			return
		}
		log.Printf("Erro ao salvar imagem do produto: %v", err)
		response.Error(w, http.StatusInternalServerError, productImageErrorMessage(err))
		return
	}

	response.JSON(w, http.StatusCreated, UploadResponse{
		Message:  "Upload realizado com sucesso!",
		FilePath: filePath,
	})
}

func productImageErrorMessage(err error) string {
	switch {
	case errors.Is(err, services.ErrImageCreate):
		return "Não foi possível criar o arquivo no servidor"
	case errors.Is(err, services.ErrImageWrite):
		return "Não foi possível salvar o arquivo"
	default:
		return "Erro ao registrar a imagem no banco de dados"
	}
}
