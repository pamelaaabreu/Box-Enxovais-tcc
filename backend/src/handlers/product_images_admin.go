package handlers

import (
	"backend/src/models"
	"backend/src/response"
	"net/http"
	"strconv"
)

func (h ProductImageHandler) AdminImages(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet, http.MethodPut, http.MethodDelete) {
		return
	}

	// Recupera o ID do produto.
	id, err := productID(r)

	if err != nil {
		response.Error(w, 400, "Produto inválido.")
		return
	}

	switch r.Method {

	case http.MethodPut:

		// Recebe a nova ordenação das imagens.
		var order models.ProductImageOrder

		if !decodeBody(w, r, &order, productJSONLimit, "Dados inválidos.") {
			return
		}

		// Limita a quantidade de IDs recebidos.
		if len(order.IDs) > 500 {
			response.Error(w, 400, "Revise a quantidade de imagens.")
			return
		}

		// Reordena as imagens no banco.
		if err = h.Service.Store.Reorder(r.Context(), id, order); err != nil {
			adminProductError(w, err)
			return
		}

	case http.MethodDelete:

		// Recupera o ID da imagem.
		imageID, e := strconv.ParseInt(
			r.PathValue("imageId"),
			10,
			64,
		)

		if e != nil || imageID <= 0 {
			response.Error(w, 400, "Imagem inválida.")
			return
		}

		// Remove a imagem.
		if err = h.Service.Store.Remove(r.Context(), id, imageID); err != nil {
			adminProductError(w, err)
			return
		}
	}

	// Retorna a galeria atualizada após a operação.
	images, err := h.Service.Store.List(r.Context(), id)

	if err != nil {
		adminProductError(w, err)
		return
	}

	w.Header().Set("Cache-Control", "no-store")

	response.JSON(w, 200, images)
}
