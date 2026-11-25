package handlers

import (
	"backend/src/models"
	"backend/src/response"
	"backend/src/services"
	"errors"
	"log"
	"net/http"
	"strconv"
)

func (h PromotionHandler) CreatePromotion(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodPost) {
		return
	}
	var req models.CreatePromotionRequest

	// Limita o corpo da requisição a 16 KiB.
	if !decodeBody(w, r, &req, campaignJSONLimit, "Requisição inválida") {
		return
	}

	// Encaminha o cadastro ao service.
	promotionID, err := h.Service.Create(r.Context(), req)

	if errors.Is(err, services.ErrPromotionInvalid) {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	if err != nil {
		log.Println("Erro ao criar promoção")
		response.Error(w, http.StatusInternalServerError, "Erro ao criar promoção")
		return
	}

	// Retorna o ID da campanha criada.
	response.JSON(w, http.StatusCreated, map[string]int{"id": promotionID})
}

func (h PromotionHandler) List(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	// Consulta as campanhas cadastradas.
	records, err := h.Service.ListCampaigns(r.Context())

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Não foi possível carregar as campanhas.")
		return
	}

	w.Header().Set("Cache-Control", "no-store")

	response.JSON(w, http.StatusOK, records)
}

func (h PromotionHandler) Update(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodPut) {
		return
	}

	// Valida o identificador da campanha.
	id, err := strconv.Atoi(r.PathValue("id"))

	if err != nil || id <= 0 {
		response.Error(w, http.StatusNotFound, "Campanha não encontrada.")
		return
	}

	var request models.CreatePromotionRequest

	// Limita o corpo da requisição a 32 KiB.
	if !decodeBody(w, r, &request, campaignJSONLimit, "Requisição inválida.") {
		return
	}

	// Encaminha a atualização ao service.
	_, err = h.Service.Update(r.Context(), id, request)

	if errors.Is(err, services.ErrPromotionInvalid) {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	if errors.Is(err, services.ErrPromotionNotFound) {
		response.Error(w, http.StatusNotFound, "Campanha não encontrada.")
		return
	}

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Não foi possível salvar a campanha.")
		return
	}

	response.JSON(w, http.StatusOK, map[string]int{"id": id})
}
