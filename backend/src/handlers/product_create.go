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
)

func (h ProductHandler) CreateProduct(w http.ResponseWriter, r *http.Request) {
	var body struct {
		models.Product
		Quantity *int32 `json:"quantity"`
	}
	decoder := json.NewDecoder(r.Body)
	if err := decoder.Decode(&body); err != nil {
		response.Error(w, 400, "Quantidade em estoque deve ser um inteiro maior ou igual a zero; verifique os dados enviados")
		return
	}
	if decoder.Decode(&struct{}{}) != io.EOF {
		response.Error(w, 400, "Informe uma quantidade em estoque inteira entre 0 e 2147483647")
		return
	}
	productID, err := h.Service.Create(r.Context(), body.Product, body.Quantity)
	if errors.Is(err, services.ErrProductSKUConflict) {
		response.Error(w, 409, err.Error())
		return
	}
	if errors.Is(err, services.ErrProductQuantity) || errors.Is(err, services.ErrProductSKU) || errors.Is(err, services.ErrProductVariants) {
		response.Error(w, 400, err.Error())
		return
	}
	if err != nil {
		log.Printf("Erro ao inserir produto: %v", err)
		response.Error(w, 500, "Erro ao criar produto")
		return
	}

	response.JSON(w, http.StatusCreated, map[string]int{"id": productID})
}
