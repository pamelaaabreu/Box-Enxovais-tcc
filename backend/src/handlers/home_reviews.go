package handlers

import (
	middlewares "backend/src/middleware"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/response"
	"backend/src/services"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
)

func (h HomeHandler) Reviews(w http.ResponseWriter, r *http.Request) {
	reviews, err := h.Store.Reviews(r.Context(), false)
	if err != nil {
		response.Error(w, 500, "Não foi possível carregar as avaliações.")
		return
	}
	response.JSON(w, 200, reviews)
}
func (h HomeHandler) AdminReviews(w http.ResponseWriter, r *http.Request) {
	reviews, err := h.Store.Reviews(r.Context(), true)
	if err != nil {
		response.Error(w, 500, "Não foi possível carregar as avaliações.")
		return
	}
	response.JSON(w, 200, reviews)
}
func (h HomeHandler) Review(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	userID, ok := middlewares.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, 401, "Entre para avaliar sua compra.")
		return
	}
	orderID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || orderID <= 0 {
		response.Error(w, 404, "Pedido não encontrado.")
		return
	}
	if r.Method == http.MethodGet {
		review, err := h.Store.OrderReview(r.Context(), userID, orderID)
		if errors.Is(err, sql.ErrNoRows) {
			response.Error(w, 404, "Compra concluída não encontrada.")
			return
		}
		if err != nil {
			response.Error(w, 500, "Não foi possível consultar a avaliação.")
			return
		}
		response.JSON(w, 200, review)
		return
	}
	var review models.ExperienceReview
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8192))
	decoder.DisallowUnknownFields()
	if err = decoder.Decode(&review); err != nil || decoder.Decode(new(any)) != io.EOF {
		response.Error(w, 400, "Informe uma avaliação válida.")
		return
	}
	if err := services.ValidateExperienceReview(&review); err != nil {
		response.Error(w, 400, err.Error())
		return
	}
	err = h.Store.CreateReview(r.Context(), userID, orderID, review)
	if errors.Is(err, repositories.ErrReviewDuplicate) {
		response.Error(w, 409, "Este pedido já foi avaliado.")
		return
	}
	if errors.Is(err, sql.ErrNoRows) {
		response.Error(w, 404, "Compra concluída não encontrada.")
		return
	}
	if err != nil {
		response.Error(w, 500, "Não foi possível salvar a avaliação.")
		return
	}
	response.JSON(w, 201, map[string]string{"message": "Avaliação recebida para moderação."})
}
func (h HomeHandler) Moderate(w http.ResponseWriter, r *http.Request) {
	moderatorID, _ := middlewares.GetUserIDFromContext(r.Context())
	reviewID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil || reviewID <= 0 {
		response.Error(w, 404, "Avaliação não encontrada.")
		return
	}
	var request struct {
		Status string `json:"status"`
	}
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
	decoder.DisallowUnknownFields()
	if decoder.Decode(&request) != nil || decoder.Decode(new(any)) != io.EOF || (request.Status != "approved" && request.Status != "rejected" && request.Status != "pending") {
		response.Error(w, 400, "Selecione um estado válido.")
		return
	}
	err = h.Store.Moderate(r.Context(), reviewID, moderatorID, request.Status)
	if errors.Is(err, sql.ErrNoRows) {
		response.Error(w, 404, "Avaliação não encontrada.")
		return
	}
	if err != nil {
		response.Error(w, 500, "Não foi possível moderar a avaliação.")
		return
	}
	response.JSON(w, 200, map[string]string{"message": "Avaliação atualizada."})
}
