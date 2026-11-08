package handlers

import (
	"backend/src/models"
	"backend/src/response"
	"backend/src/services"
	"encoding/json"
	"errors"
	"log"
	"net/http"
)

type PromotionHandler struct{ Service services.PromotionService }

func (h PromotionHandler) CreatePromotion(w http.ResponseWriter, r *http.Request) {
	var req models.CreatePromotionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Requisição inválida")
		return
	}

	promotionID, err := h.Service.Create(r.Context(), req)
	if err != nil {
		log.Printf("Erro ao criar promoção: %v", err)
		response.Error(w, http.StatusInternalServerError, "Erro ao criar promoção")
		return
	}

	response.JSON(w, http.StatusCreated, map[string]int{"id": promotionID})
}

func (h PromotionHandler) AddProductToPromotion(w http.ResponseWriter, r *http.Request) {
	var req models.AddToPromotionRequest
	if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
		response.Error(w, http.StatusBadRequest, "Requisição inválida")
		return
	}

	err := h.Service.AddProduct(r.Context(), req)
	if err != nil {
		switch {
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
