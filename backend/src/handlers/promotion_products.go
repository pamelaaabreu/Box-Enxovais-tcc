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
)

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
