package handlers

import (
	"backend/src/models"
	"backend/src/response"
	"backend/src/services"
	"encoding/json"
	"errors"
	"io"
	"log"
	"net/http"
	"path/filepath"
	"strconv"
)

type PromotionHandler struct{ Service services.PromotionService }

func (h PromotionHandler) CreatePromotion(w http.ResponseWriter, r *http.Request) {
	var req models.CreatePromotionRequest
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16384))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil || decoder.Decode(new(any)) != io.EOF {
		response.Error(w, http.StatusBadRequest, "Requisição inválida")
		return
	}

	promotionID, err := h.Service.Create(r.Context(), req)
	if errors.Is(err, services.ErrPromotionInvalid) {
		response.Error(w, 400, err.Error())
		return
	}
	if err != nil {
		log.Printf("Erro ao criar promoção: %v", err)
		response.Error(w, http.StatusInternalServerError, "Erro ao criar promoção")
		return
	}

	response.JSON(w, http.StatusCreated, map[string]int{"id": promotionID})
}

func (h PromotionHandler) AddProductToPromotion(w http.ResponseWriter, r *http.Request) {
	var req models.AddToPromotionRequest
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 16384))
	decoder.DisallowUnknownFields()
	if err := decoder.Decode(&req); err != nil || decoder.Decode(new(any)) != io.EOF {
		response.Error(w, http.StatusBadRequest, "Requisição inválida")
		return
	}

	err := h.Service.AddProduct(r.Context(), req)
	if err != nil {
		switch {
		case errors.Is(err, services.ErrPromotionInvalid):
			response.Error(w, 400, err.Error())
		case errors.Is(err, services.ErrPromotionNotFound):
			response.Error(w, http.StatusNotFound, "Promoção não encontrada ou inativa")
		case errors.Is(err, services.ErrPromotionLookup):
			log.Printf("Erro ao buscar promoção: %v", err)
			response.Error(w, http.StatusInternalServerError, "Erro interno do servidor")
		default:
			log.Printf("Erro ao adicionar produto à promoção: %v", err)
			response.Error(w, http.StatusInternalServerError, "Erro ao adicionar produto à promoção")
		}
		return
	}

	response.JSON(w, http.StatusCreated, map[string]string{"message": "Produto adicionado à promoção com sucesso"})
}

func (h PromotionHandler) List(w http.ResponseWriter, r *http.Request) {
	records, err := h.Service.Store.ListCampaigns(r.Context())
	if err != nil {
		response.Error(w, 500, "Não foi possível carregar as campanhas.")
		return
	}
	w.Header().Set("Cache-Control", "no-store")
	response.JSON(w, 200, records)
}
func (h PromotionHandler) Update(w http.ResponseWriter, r *http.Request) {
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id <= 0 {
		response.Error(w, 404, "Campanha não encontrada.")
		return
	}
	var request models.CreatePromotionRequest
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 32768))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&request) != nil || decoder.Decode(new(any)) != io.EOF {
		response.Error(w, 400, "Requisição inválida.")
		return
	}
	_, err = h.Service.Update(r.Context(), id, request)
	if errors.Is(err, services.ErrPromotionInvalid) {
		response.Error(w, 400, err.Error())
		return
	}
	if errors.Is(err, services.ErrPromotionNotFound) {
		response.Error(w, 404, "Campanha não encontrada.")
		return
	}
	if err != nil {
		response.Error(w, 500, "Não foi possível salvar a campanha.")
		return
	}
	response.JSON(w, 200, map[string]int{"id": id})
}

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
