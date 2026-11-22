package handlers

import (
	middlewares "backend/src/middleware"
	"backend/src/repositories"
	"backend/src/response"
	"backend/src/services"
	"errors"
	"log"
	"math"
	"net/http"
	"net/url"
	"strconv"
)

type FavoritesHandler struct{ Service services.FavoritesService }

func (h FavoritesHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	userID, ok := middlewares.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, 401, "Faça login para acessar seus favoritos")
		return
	}
	if r.Method == http.MethodGet {
		values, err := url.ParseQuery(r.URL.RawQuery)
		if err != nil {
			response.Error(w, 400, "Parâmetros de consulta inválidos")
			return
		}
		page, err := h.Service.List(r.Context(), userID, values)
		if err != nil {
			var validation services.ValidationError
			if errors.As(err, &validation) {
				response.Error(w, 400, validation.Error())
				return
			}
			log.Println("Could not list favorites")
			response.Error(w, 500, "Não foi possível carregar seus favoritos")
			return
		}
		response.JSON(w, 200, page)
		return
	}
	productID, err := strconv.ParseInt(r.PathValue("productId"), 10, 64)
	if err != nil || productID <= 0 || productID > math.MaxInt32 {
		response.Error(w, 400, "Produto inválido")
		return
	}
	favorited := r.Method == http.MethodPut
	if favorited {
		err = h.Service.Store.Add(r.Context(), userID, productID)
	} else {
		err = h.Service.Store.Remove(r.Context(), userID, productID)
	}
	if err != nil {
		switch {
		case errors.Is(err, repositories.ErrFavoriteProductNotFound):
			response.Error(w, 404, err.Error())
		case errors.Is(err, repositories.ErrFavoriteProductUnavailable):
			response.Error(w, 409, err.Error())
		default:
			log.Println("Could not update favorite")
			response.Error(w, 500, "Não foi possível atualizar seus favoritos")
		}
		return
	}
	response.Success(w, 200, "", struct {
		ProductID int64 `json:"productId"`
		Favorited bool  `json:"favorited"`
	}{productID, favorited})
}
