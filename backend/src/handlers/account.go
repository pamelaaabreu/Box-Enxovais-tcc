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
	"regexp"
	"strconv"
	"strings"
	"time"
	"unicode/utf8"
)

type AccountHandler struct {
	Store repositories.AccountRepository
}

func (h AccountHandler) ServeHTTP(w http.ResponseWriter, r *http.Request) {
	if !allowMethods(w, r, http.MethodGet, http.MethodPatch, http.MethodPost, http.MethodPut, http.MethodDelete) {
		return
	}

	// Impede o armazenamento de informações pessoais em cache.
	w.Header().Set("Cache-Control", "no-store")

	// Recupera o usuário autenticado pelo middleware.
	userID, ok := middlewares.GetUserIDFromContext(r.Context())

	if !ok || userID <= 0 {
		response.Error(w, 401, "Faça login para acessar sua conta")
		return
	}

	// Operações relacionadas ao perfil.
	if r.URL.Path == "/me" {

		if r.Method == http.MethodGet {
			p, err := h.Store.Profile(r.Context(), userID)

			accountResult(w, 200, p, err)
			return
		}

		var patch models.AccountProfilePatch

		// Interpreta os dados que serão atualizados.
		if !decodeBody(w, r, &patch, smallJSONLimit, "Dados inválidos.") {
			return
		}

		// Valida e normaliza os dados pessoais.
		if message := validateProfilePatch(&patch); message != "" {
			response.Error(w, 400, message)
			return
		}

		p, err := h.Store.UpdateProfile(r.Context(), userID, patch)

		// Trata especificamente a duplicidade de CPF.
		if errors.Is(err, repositories.ErrDuplicateCPF) {
			response.Error(w, 409, err.Error())
			return
		}

		accountResult(w, 200, p, err)
		return
	}

	// Recupera o identificador do endereço, quando informado.
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

		// Lista os endereços do usuário autenticado.
		addresses, err := h.Store.Addresses(r.Context(), userID)

		accountResult(w, 200, addresses, err)

	case http.MethodPost, http.MethodPatch:

		// Cadastra ou atualiza um endereço.
		var address models.UserAddress

		if !decodeBody(w, r, &address, smallJSONLimit, "Dados inválidos.") {
			return
		}

		address.Label = strings.TrimSpace(address.Label)

		// Valida o endereço e seu nome de identificação.
		if !validShippingAddress(&address.ShippingAddress) ||
			address.Label == "" ||
			utf8.RuneCountInString(address.Label) > 40 ||
			strings.ContainsRune(address.Label, 0) {

			response.Error(w, 400, "Confira os campos do endereço")
			return
		}

		// Remove o hífen do CEP.
		address.ZipCode = strings.ReplaceAll(address.ZipCode, "-", "")

		address, err := h.Store.SaveAddress(r.Context(), userID, id, address)

		accountResult(w, 200, address, err)

	case http.MethodDelete:

		// Exclui um endereço pertencente ao usuário.
		accountResult(w, 200, nil, h.Store.DeleteAddress(r.Context(), userID, id))

	case http.MethodPut:

		// Define o endereço principal.
		accountResult(w, 200, nil, h.Store.SetDefaultAddress(r.Context(), userID, id))
	}
}

// Centraliza as respostas das operações da conta.
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

func normalizeContactPhone(raw string) (string, bool) { return services.NormalizeContactPhone(raw) }
func validateProfilePatch(p *models.AccountProfilePatch) string {
	return services.ValidateProfilePatch(p)
}
func validCPF(cpf string) bool { return services.ValidCPF(cpf) }
