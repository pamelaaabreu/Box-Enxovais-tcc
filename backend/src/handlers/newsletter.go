package handlers

import (
	"backend/src/models"
	"backend/src/response"
	"backend/src/services"
	"errors"
	"log"
	"net/http"
)

type NewsletterHandler struct {
	Service services.NewsletterService
}

func (h NewsletterHandler) SubscribeNewsletter(
	w http.ResponseWriter,
	r *http.Request,
) {

	// Permite somente requisições POST.
	if r.Method != http.MethodPost {
		response.Error(
			w,
			http.StatusMethodNotAllowed,
			"Método não permitido",
		)
		return
	}

	// Decodifica os dados recebidos.
	var subReq models.SubscriptionRequest

	if !decodeBody(w, r, &subReq, smallJSONLimit, "Corpo da requisição inválido") {
		return
	}

	// Encaminha o e-mail ao service.
	if err := h.Service.Subscribe(r.Context(), subReq.Email); err != nil {

		switch {

		case errors.Is(err, services.ErrNewsletterEmailRequired):
			response.Error(
				w,
				http.StatusBadRequest,
				"O e-mail é obrigatório.",
			)

		case errors.Is(err, services.ErrNewsletterEmailInvalid):
			response.Error(w, http.StatusBadRequest, "Informe um e-mail v\u00e1lido.")

		case errors.Is(err, services.ErrNewsletterConfiguration):
			log.Println("Newsletter client not configured")

			response.Error(
				w,
				http.StatusInternalServerError,
				"Erro interno do servidor.",
			)

		case errors.Is(err, services.ErrNewsletterDelivery):
			log.Println("Newsletter delivery failed")

			response.Error(
				w,
				http.StatusInternalServerError,
				"Ocorreu um erro ao processar sua inscrição.",
			)

		default:
			response.Error(
				w,
				http.StatusInternalServerError,
				"Não foi possível enviar o e-mail de confirmação.",
			)
		}

		return
	}

	// Confirma a inscrição.
	response.JSON(w, http.StatusOK, map[string]string{
		"message": "Inscrição realizada com sucesso!",
	})
}
