package handlers

import (
	middlewares "backend/src/middleware"
	"backend/src/models"
	"backend/src/repositories"
	"backend/src/response"
	"database/sql"
	"errors"
	"net/http"
	"regexp"
	"strconv"
	"strings"
	"unicode/utf8"
)

var phoneFormat = regexp.MustCompile("^[0-9()+ .-]+$")
var phoneSeparators = strings.NewReplacer("(", "", ")", "", " ", "", "-", "", ".", "")

func normalizeContactPhone(raw string) (string, bool) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", true
	}
	if !phoneFormat.MatchString(raw) {
		return "", false
	}
	normalized := strings.TrimPrefix(phoneSeparators.Replace(raw), "+55")
	return normalized, regexp.MustCompile("^[1-9][0-9][0-9]{8,9}$").MatchString(normalized)
}

type AccountHandler struct {
	Store repositories.AccountRepository
}

func (h AccountHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	w.Header().Set("Cache-Control", "no-store")
	userID, ok := middlewares.GetUserIDFromContext(r.Context())
	if !ok {
		response.Error(w, 401, "Faça login para acessar sua conta")
		return
	}
	if r.URL.Path == "/me" {
		if r.Method == http.MethodGet {
			p, err := h.Store.Profile(r.Context(), userID)
			accountResult(w, 200, p, err)
			return
		}
		var p models.AccountProfile
		if !decodeCartBody(w, r, &p) {
			response.Error(w, 400, "Dados de perfil inválidos")
			return
		}
		p.Name = strings.TrimSpace(p.Name)
		p.Phone, ok = normalizeContactPhone(p.Phone)
		if !ok || utf8.RuneCountInString(p.Name) < 2 || utf8.RuneCountInString(p.Name) > 200 || strings.ContainsRune(p.Name, 0) {
			response.Error(w, 400, "Confira o nome completo e o telefone com DDD")
			return
		}
		p, err := h.Store.UpdateProfile(r.Context(), userID, p)
		accountResult(w, 200, p, err)
		return
	}
	var id int64
	if raw := r.PathValue("id"); raw != "" {
		var err error
		id, err = strconv.ParseInt(raw, 10, 64)
		if err != nil || id <= 0 {
			response.Error(w, 404, "Registro não encontrado")
			return
		}
	}
	switch r.Method {
	case http.MethodGet:
		addresses, err := h.Store.Addresses(r.Context(), userID)
		accountResult(w, 200, addresses, err)
	case http.MethodPost, http.MethodPatch:
		var address models.UserAddress
		if !decodeCartBody(w, r, &address) {
			response.Error(w, 400, "Dados de endereço inválidos")
			return
		}
		address.Label = strings.TrimSpace(address.Label)
		if !validShippingAddress(&address.ShippingAddress) || address.Label == "" || utf8.RuneCountInString(address.Label) > 40 || strings.ContainsRune(address.Label, 0) {
			response.Error(w, 400, "Confira os campos do endereço")
			return
		}
		address, err := h.Store.SaveAddress(r.Context(), userID, id, address)
		accountResult(w, 200, address, err)
	case http.MethodDelete:
		accountResult(w, 200, nil, h.Store.DeleteAddress(r.Context(), userID, id))
	case http.MethodPut:
		accountResult(w, 200, nil, h.Store.SetDefaultAddress(r.Context(), userID, id))
	}
}

func accountResult(w http.ResponseWriter, status int, data any, err error) {
	switch {
	case errors.Is(err, sql.ErrNoRows):
		response.Error(w, 404, "Registro não encontrado")
	case err != nil:
		response.Error(w, 500, "Não foi possível concluir a operação. Tente novamente.")
	default:
		response.Success(w, status, "", data)
	}
}
