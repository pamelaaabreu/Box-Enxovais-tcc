package handlers

import (
	middlewares "backend/src/middleware"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/response"
	"backend/src/services"
	"database/sql"
	"errors"
	"net/http"
	"strconv"
)

// Lista as avaliações públicas.
func (h HomeHandler) Reviews(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	reviews, err := h.Store.Reviews(r.Context(), false)

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Não foi possível carregar as avaliações.")
		return
	}

	response.JSON(w, http.StatusOK, reviews)
}

// Lista as avaliações para administração.
func (h HomeHandler) AdminReviews(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	reviews, err := h.Store.Reviews(r.Context(), true)

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Não foi possível carregar as avaliações.")
		return
	}

	response.JSON(w, http.StatusOK, reviews)
}

// Consulta ou cadastra uma avaliação de compra.
func (h HomeHandler) Review(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet, http.MethodPost) {
		return
	}

	w.Header().Set("Cache-Control", "no-store")

	// Recupera o usuário autenticado.
	userID, ok := middlewares.GetUserIDFromContext(r.Context())

	if !ok || userID <= 0 {
		response.Error(w, http.StatusUnauthorized, "Entre para avaliar sua compra.")
		return
	}

	// Valida o identificador do pedido.
	orderID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)

	if err != nil || orderID <= 0 {
		response.Error(w, http.StatusNotFound, "Pedido não encontrado.")
		return
	}

	// Consulta uma avaliação existente.
	if r.Method == http.MethodGet {

		review, err := h.Store.OrderReview(
			r.Context(),
			userID,
			orderID,
		)

		if errors.Is(err, sql.ErrNoRows) {
			response.Error(w, http.StatusNotFound, "Compra concluída não encontrada.")
			return
		}

		if err != nil {
			response.Error(w, http.StatusInternalServerError, "Não foi possível consultar a avaliação.")
			return
		}

		response.JSON(w, http.StatusOK, review)
		return
	}

	var review models.ExperienceReview

	// Limita a requisição a 8 KiB.
	if !decodeBody(w, r, &review, 8192, "Informe uma avaliação válida.") {
		return
	}

	// Valida as notas e o comentário.
	if err := services.ValidateExperienceReview(&review); err != nil {
		response.Error(w, http.StatusBadRequest, err.Error())
		return
	}

	// Persiste a avaliação.
	err = h.Store.CreateReview(
		r.Context(),
		userID,
		orderID,
		review,
	)

	// Impede avaliações duplicadas.
	if errors.Is(err, repositories.ErrReviewDuplicate) {
		response.Error(w, http.StatusConflict, "Este pedido já foi avaliado.")
		return
	}

	if errors.Is(err, sql.ErrNoRows) {
		response.Error(w, http.StatusNotFound, "Compra concluída não encontrada.")
		return
	}

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Não foi possível salvar a avaliação.")
		return
	}

	response.JSON(w, http.StatusCreated, map[string]string{
		"message": "Avaliação recebida para moderação.",
	})
}

// Realiza a moderação administrativa.
func (h HomeHandler) Moderate(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	if !allowMethods(w, r, http.MethodPatch) {
		return
	}

	// Recupera o administrador responsável.
	moderatorID, authenticated := middlewares.GetUserIDFromContext(r.Context())
	if !authenticated || moderatorID <= 0 {
		response.Error(w, http.StatusUnauthorized, "Faça login para continuar.")
		return
	}

	// Valida o identificador da avaliação.
	reviewID, err := strconv.ParseInt(r.PathValue("id"), 10, 64)

	if err != nil || reviewID <= 0 {
		response.Error(w, http.StatusNotFound, "Avaliação não encontrada.")
		return
	}

	var request struct {
		Status string `json:"status"`
	}

	// Limita a requisição a 1 KiB.
	if !decodeBody(w, r, &request, 1024, "Selecione um estado válido.") {
		return
	}
	if request.Status != "approved" &&
		request.Status != "rejected" &&
		request.Status != "pending" {

		response.Error(w, http.StatusBadRequest, "Selecione um estado válido.")
		return
	}

	// Atualiza o status da avaliação.
	err = h.Store.Moderate(
		r.Context(),
		reviewID,
		moderatorID,
		request.Status,
	)

	if errors.Is(err, sql.ErrNoRows) {
		response.Error(w, http.StatusNotFound, "Avaliação não encontrada.")
		return
	}

	if err != nil {
		response.Error(w, http.StatusInternalServerError, "Não foi possível moderar a avaliação.")
		return
	}

	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Avaliação atualizada.",
	})
}
