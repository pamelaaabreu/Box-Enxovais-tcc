package handlers

import (
	"backend/src/response"
	"backend/src/services"
	"errors"
	"log"
	"net/http"
	"strconv"
)

type UploadResponse struct {
	Message  string `json:"message"`
	FilePath string `json:"filePath"`
}

type ProductImageHandler struct{ Service services.ProductImageService }

func (h ProductImageHandler) UploadProductImage(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.Error(w, http.StatusMethodNotAllowed, "Método não permitido")
		return
	}

	if err := r.ParseMultipartForm(10 << 20); err != nil {
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

	filePath, err := h.Service.Upload(r.Context(), productId, handler.Filename, file)
	if err != nil {
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
