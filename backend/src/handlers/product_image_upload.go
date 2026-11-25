package handlers

import (
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/response"
	"backend/src/services"
	"database/sql"
	"errors"
	"log"
	"net/http"
	"strconv"
)

type UploadResponse = models.UploadResponse

type ProductImageHandler struct {
	Service services.ProductImageService
}

func (h ProductImageHandler) UploadProductImage(w http.ResponseWriter, r *http.Request) {
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
	// Recupera o ID do produto.
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

	if productId <= 0 {
		response.Error(w, http.StatusBadRequest, "Produto inválido")
		return
	}
	// Recupera a variante opcional.
	var variantID *int64

	if raw := r.FormValue("variantId"); raw != "" {

		value, e := strconv.ParseInt(raw, 10, 64)

		if e != nil || value <= 0 {
			response.Error(w, http.StatusBadRequest, "Variação inválida.")
			return
		}

		variantID = &value
	}

	// Encaminha a imagem ao service utilizando
	// uma extensão determinada pelo backend.
	filePath, err := h.Service.Upload(
		r.Context(),
		productId,
		"image"+ext,
		file,
		variantID,
	)

	if err != nil {
		if errors.Is(err, repositories.ErrImageConflict) ||
			errors.Is(err, sql.ErrNoRows) {

			adminProductError(w, err)
			return
		}

		log.Println("Erro ao salvar imagem do produto")

		response.Error(
			w,
			http.StatusInternalServerError,
			productImageErrorMessage(err),
		)

		return
	}

	response.JSON(w, http.StatusCreated, UploadResponse{
		Message:  "Upload realizado com sucesso!",
		FilePath: filePath,
	})
}

// Traduz os erros de armazenamento em mensagens.
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
