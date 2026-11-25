package handlers

import (
	"backend/src/response"
	"bytes"
	"encoding/json"
	"errors"
	"io"
	"net/http"
	"strings"
)

const (
	smallJSONLimit    = 4 << 10
	reviewJSONLimit   = 8 << 10
	campaignJSONLimit = 32 << 10
	productJSONLimit  = 2 << 20
)

var errJSONObject = errors.New("request must contain one JSON object")

// Não escreve a resposta: permite ao endpoint preservar sua mensagem pública.
func decodeJSON(w http.ResponseWriter, r *http.Request, target any, limit int64) error {
	decoder := json.NewDecoder(http.MaxBytesReader(w, r.Body, limit))
	var raw json.RawMessage
	if err := decoder.Decode(&raw); err != nil {
		return err
	}
	var extra any
	if err := decoder.Decode(&extra); err != io.EOF {
		if err != nil {
			return err
		}
		return errJSONObject
	}
	if !strings.HasPrefix(strings.TrimSpace(string(raw)), "{") {
		return errJSONObject
	}
	object := json.NewDecoder(bytes.NewReader(raw))
	object.DisallowUnknownFields()
	return object.Decode(target)
}
func decodeBody(w http.ResponseWriter, r *http.Request, target any, limit int64, message string) bool {
	if err := decodeJSON(w, r, target, limit); err != nil {
		status := http.StatusBadRequest
		var oversized *http.MaxBytesError
		if errors.As(err, &oversized) {
			status = http.StatusRequestEntityTooLarge
			message = "A requisição excede o tamanho permitido."
		}
		response.Error(w, status, message)
		return false
	}
	return true
}
func allowMethods(w http.ResponseWriter, r *http.Request, methods ...string) bool {
	for _, method := range methods {
		if r.Method == method {
			return true
		}
	}
	w.Header().Set("Allow", strings.Join(methods, ", "))
	response.Error(w, http.StatusMethodNotAllowed, "Método não permitido")
	return false
}
