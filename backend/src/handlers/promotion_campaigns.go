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
	"strconv"
)

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
