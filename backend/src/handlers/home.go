package handlers

import (
	middlewares "backend/src/middleware"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/response"
	"database/sql"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strconv"
	"strings"
	"unicode/utf8"
)

type HomeHandler struct{ Store repositories.HomeRepository }

func (h HomeHandler) Highlights(w http.ResponseWriter, r *http.Request) {
	p, s, e := h.Store.Highlights(r.Context())
	if e != nil {
		response.Error(w, 500, "Não foi possível carregar os destaques.")
		return
	}
	response.JSON(w, 200, map[string]any{"products": p, "bestSellers": s})
}
func (h HomeHandler) Featured(w http.ResponseWriter, r *http.Request) {
	products, err := h.Store.Featured(r.Context())
	if err != nil {
		response.Error(w, 500, "Não foi possível carregar os destaques.")
		return
	}
	response.JSON(w, 200, map[string]any{"products": products})
}

func (h HomeHandler) Campaign(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	c, e := h.Store.Campaign(r.Context())
	if e != nil {
		response.Error(w, 500, "Não foi possível carregar a campanha.")
		return
	}
	response.JSON(w, 200, c)
}
func (h HomeHandler) Reviews(w http.ResponseWriter, r *http.Request) {
	v, e := h.Store.Reviews(r.Context(), false)
	if e != nil {
		response.Error(w, 500, "Não foi possível carregar as avaliações.")
		return
	}
	response.JSON(w, 200, v)
}
func (h HomeHandler) AdminReviews(w http.ResponseWriter, r *http.Request) {
	v, e := h.Store.Reviews(r.Context(), true)
	if e != nil {
		response.Error(w, 500, "Não foi possível carregar as avaliações.")
		return
	}
	response.JSON(w, 200, v)
}
func (h HomeHandler) Review(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	user, ok := middlewares.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, 401, "Entre para avaliar sua compra.")
		return
	}
	id, e := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if e != nil || id <= 0 {
		response.Error(w, 404, "Pedido não encontrado.")
		return
	}
	if r.Method == http.MethodGet {
		v, e := h.Store.OrderReview(r.Context(), user, id)
		if errors.Is(e, sql.ErrNoRows) {
			response.Error(w, 404, "Compra concluída não encontrada.")
			return
		}
		if e != nil {
			response.Error(w, 500, "Não foi possível consultar a avaliação.")
			return
		}
		response.JSON(w, 200, v)
		return
	}
	var v models.ExperienceReview
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, 8192))
	decoder.DisallowUnknownFields()
	if e = decoder.Decode(&v); e != nil || decoder.Decode(new(any)) != io.EOF {
		response.Error(w, 400, "Informe uma avaliação válida.")
		return
	}
	v.Comment = strings.TrimSpace(v.Comment)
	for _, n := range []int{v.Overall, v.Navigation, v.Service, v.Experience} {
		if n < 1 || n > 5 {
			response.Error(w, 400, "Selecione uma nota de 1 a 5 em todos os critérios.")
			return
		}
	}
	if utf8.RuneCountInString(v.Comment) > 1000 || strings.ContainsRune(v.Comment, 0) {
		response.Error(w, 400, "O comentário deve ter até 1000 caracteres válidos.")
		return
	}
	e = h.Store.CreateReview(r.Context(), user, id, v)
	if errors.Is(e, repositories.ErrReviewDuplicate) {
		response.Error(w, 409, "Este pedido já foi avaliado.")
		return
	}
	if errors.Is(e, sql.ErrNoRows) {
		response.Error(w, 404, "Compra concluída não encontrada.")
		return
	}
	if e != nil {
		response.Error(w, 500, "Não foi possível salvar a avaliação.")
		return
	}
	response.JSON(w, 201, map[string]string{"message": "Avaliação recebida para moderação."})
}
func (h HomeHandler) Moderate(w http.ResponseWriter, r *http.Request) {
	user, _ := middlewares.GetUserIDFromContext(r.Context())
	id, e := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if e != nil || id <= 0 {
		response.Error(w, 404, "Avaliação não encontrada.")
		return
	}
	var v struct {
		Status string `json:"status"`
	}
	d := json.NewDecoder(http.MaxBytesReader(w, r.Body, 1024))
	d.DisallowUnknownFields()
	if d.Decode(&v) != nil || d.Decode(new(any)) != io.EOF || (v.Status != "approved" && v.Status != "rejected" && v.Status != "pending") {
		response.Error(w, 400, "Selecione um estado válido.")
		return
	}
	e = h.Store.Moderate(r.Context(), id, user, v.Status)
	if errors.Is(e, sql.ErrNoRows) {
		response.Error(w, 404, "Avaliação não encontrada.")
		return
	}
	if e != nil {
		response.Error(w, 500, "Não foi possível moderar a avaliação.")
		return
	}
	response.JSON(w, 200, map[string]string{"message": "Avaliação atualizada."})
}

func (h HomeHandler) Categories(w http.ResponseWriter, r *http.Request) {
	v, e := h.Store.Categories(r.Context())
	if e != nil {
		response.Error(w, 500, "Não foi possível carregar as categorias.")
		return
	}
	response.JSON(w, 200, v)
}

func (h HomeHandler) CampaignDetail(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	id, err := strconv.Atoi(r.PathValue("id"))
	if err != nil || id <= 0 {
		response.Error(w, 404, "Campanha não encontrada.")
		return
	}
	campaign, err := h.Store.CampaignByID(r.Context(), id)
	if err != nil {
		response.Error(w, 500, "Não foi possível carregar a campanha.")
		return
	}
	if campaign == nil {
		response.Error(w, 404, "Esta campanha não está disponível.")
		return
	}
	response.JSON(w, 200, campaign)
}
