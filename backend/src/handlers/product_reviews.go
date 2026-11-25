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
	"strings"
	"time"
)

type ProductReviewHandler struct {
	Service services.ProductReviewService
}

// Centraliza o tratamento de erros das avaliações.
func reviewResult(w http.ResponseWriter, status int, value any, err error) {

	var validation services.ValidationError
	switch {
	case errors.As(err, &validation):
		response.Error(w, http.StatusBadRequest, validation.Error())

	case errors.Is(err, sql.ErrNoRows):
		response.Error(w, 404, "Avaliação ou compra elegível não encontrada.")

	case errors.Is(err, repositories.ErrReviewDuplicate):
		response.Error(w, 409, "Você já avaliou este produto. Edite a avaliação existente.")

	case errors.Is(err, repositories.ErrReviewConflict):
		response.Error(w, 409, "A avaliação mudou ou não possui autorização de publicação. Recarregue a lista.")

	case err != nil:
		response.Error(w, 500, "Não foi possível carregar ou salvar as avaliações.")

	default:
		response.JSON(w, status, value)
	}
}

// Recupera o ID do produto ou da avaliação.
func reviewPathID(w http.ResponseWriter, r *http.Request) (int64, bool) {

	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)

	if err != nil || id <= 0 {
		response.Error(w, 404, "Avaliação ou produto não encontrado.")
		return 0, false
	}

	return id, true
}

// Lista as avaliações do usuário autenticado.
func (h ProductReviewHandler) Mine(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	w.Header().Set("Cache-Control", "no-store")

	id, authenticated := middlewares.GetUserIDFromContext(r.Context())
	if !authenticated || id <= 0 {
		response.Error(w, http.StatusUnauthorized, "Faça login para continuar.")
		return
	}

	items, err := h.Service.Store.Mine(r.Context(), id)

	reviewResult(w, 200, items, err)
}

// Lista os produtos que podem ser avaliados.
func (h ProductReviewHandler) Reviewable(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	w.Header().Set("Cache-Control", "no-store")

	id, authenticated := middlewares.GetUserIDFromContext(r.Context())
	if !authenticated || id <= 0 {
		response.Error(w, http.StatusUnauthorized, "Faça login para continuar.")
		return
	}

	items, err := h.Service.Store.Reviewable(r.Context(), id)

	reviewResult(w, 200, items, err)
}

// Lista as avaliações públicas de um produto.
func (h ProductReviewHandler) Public(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	id, ok := reviewPathID(w, r)

	if !ok {
		return
	}

	items, err := h.Service.Store.Public(r.Context(), id, false)

	reviewResult(w, 200, items, err)
}

// Recupera as avaliações públicas da Home.
func (h ProductReviewHandler) Home(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	items, err := h.Service.Store.Public(r.Context(), 0, true)

	reviewResult(w, 200, items, err)
}

// Recupera as médias de vários produtos.
func (h ProductReviewHandler) Summaries(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	// Separa os IDs recebidos por vírgula.
	parts := strings.Split(r.URL.Query().Get("ids"), ",")

	if len(parts) > 100 {
		response.Error(w, 400, "Consulte até 100 produtos por vez.")
		return
	}

	ids := []int64{}
	seen := map[int64]bool{}

	for _, raw := range parts {

		id, err := strconv.ParseInt(raw, 10, 64)

		if err != nil || id <= 0 {
			response.Error(w, 400, "Informe identificadores válidos de produtos.")
			return
		}

		// Evita encaminhar IDs duplicados.
		if !seen[id] {
			ids = append(ids, id)
			seen[id] = true
		}
	}

	items, err := h.Service.Store.Summaries(r.Context(), ids)

	reviewResult(w, 200, items, err)
}

// Cadastra ou edita uma avaliação.
func (h ProductReviewHandler) Save(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodPost, http.MethodPatch) {
		return
	}

	w.Header().Set("Cache-Control", "no-store")

	id, ok := reviewPathID(w, r)

	if !ok {
		return
	}

	userID, authenticated := middlewares.GetUserIDFromContext(r.Context())
	if !authenticated || userID <= 0 {
		response.Error(w, http.StatusUnauthorized, "Faça login para continuar.")
		return
	}

	var input models.ProductReviewInput

	// Limita o JSON a 8 KiB.
	if !decodeBody(w, r, &input, 8192, "Informe uma avaliação válida.") {
		return
	}

	// Define o cadastro como operação padrão.
	productID, reviewID, status := id, int64(0), 201

	// PATCH utiliza o ID da avaliação existente.
	if r.Method == http.MethodPatch {
		productID = 0
		reviewID = id
		status = 200
	}

	err := h.Service.Save(
		r.Context(),
		userID,
		productID,
		reviewID,
		input,
	)

	reviewResult(w, status, map[string]string{
		"message": "Avaliação salva e enviada para moderação.",
	}, err)
}

// Lista as avaliações para a administração.
func (h ProductReviewHandler) Admin(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet) {
		return
	}

	w.Header().Set("Cache-Control", "no-store")

	items, err := h.Service.Store.Admin(r.Context())

	reviewResult(w, 200, items, err)
}

// Atualiza o status de moderação.
func (h ProductReviewHandler) Moderate(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodPatch) {
		return
	}

	id, ok := reviewPathID(w, r)

	if !ok {
		return
	}

	var input struct {
		Status            string    `json:"status"`
		ExpectedUpdatedAt time.Time `json:"expectedUpdatedAt"`
	}

	// Limita a requisição a 1 KiB.
	if !decodeBody(w, r, &input, 1024, "Selecione um estado válido e recarregue a avaliação.") {
		return
	}
	if input.ExpectedUpdatedAt.IsZero() ||
		(input.Status != "approved" &&
			input.Status != "pending" &&
			input.Status != "rejected") {

		response.Error(w, 400, "Selecione um estado válido e recarregue a avaliação.")
		return
	}

	// Recupera o administrador responsável.
	moderator, authenticated := middlewares.GetUserIDFromContext(r.Context())
	if !authenticated || moderator <= 0 {
		response.Error(w, http.StatusUnauthorized, "Faça login para continuar.")
		return
	}

	err := h.Service.Store.Moderate(
		r.Context(),
		id,
		moderator,
		input.Status,
		input.ExpectedUpdatedAt,
	)

	reviewResult(w, 200, map[string]string{
		"message": "Avaliação atualizada.",
	}, err)
}
