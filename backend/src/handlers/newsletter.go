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

type NewsletterHandler struct{ Service services.NewsletterService }

func (h NewsletterHandler) SubscribeNewsletter(w http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		response.Error(w, http.StatusMethodNotAllowed, "Método não permitido")
		return
	}

	var subReq models.SubscriptionRequest
	if err := json.NewDecoder(r.Body).Decode(&subReq); err != nil {
		response.Error(w, http.StatusBadRequest, "Corpo da requisição inválido")
		return
	}

	if err := h.Service.Subscribe(r.Context(), subReq.Email); err != nil {
		switch {
		case errors.Is(err, services.ErrNewsletterEmailRequired):
			response.Error(w, http.StatusBadRequest, "O e-mail é obrigatório.")
		case errors.Is(err, services.ErrNewsletterConfiguration):
			log.Println("Newsletter client not configured")
			response.Error(w, http.StatusInternalServerError, "Erro interno do servidor.")
		case errors.Is(err, services.ErrNewsletterDelivery):
			log.Println("Newsletter delivery failed")
			response.Error(w, http.StatusInternalServerError, "Ocorreu um erro ao processar sua inscrição.")
		default:
			response.Error(w, http.StatusInternalServerError, "Não foi possível enviar o e-mail de confirmação.")
		}
		return
	}
	response.JSON(w, http.StatusOK, map[string]string{"message": "Inscrição realizada com sucesso!"})
}
