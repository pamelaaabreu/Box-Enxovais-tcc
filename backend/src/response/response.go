package response

import (
	"encoding/json"
	"log"
	"net/http"
)

const internalErrorJSON = `{"success":false,"message":"Erro interno do servidor"}`

// Estrutura padronizada das respostas da API.
type APIResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Data    any    `json:"data,omitempty"`
}

// Converte os dados em JSON e envia a resposta HTTP.
func JSON(w http.ResponseWriter, status int, payload any) {
	if status == http.StatusNoContent {
		w.Header().Del("Content-Type")
		w.Header().Del("Content-Length")
		w.WriteHeader(status)
		return
	}

	// Converte os dados em um slice de bytes.
	body, err := json.Marshal(payload)

	// Caso a conversão falhe, retorna um erro interno.
	if err != nil {
		log.Printf("Falha de serialização JSON: status=%d tipo=%T", status, payload)

		status = http.StatusInternalServerError

		body = []byte(internalErrorJSON)
	}

	// Informa que a resposta contém JSON.
	w.Header().Set("Content-Type", "application/json")

	// Define o código HTTP.
	w.WriteHeader(status)

	// Escreve o conteúdo, acrescentando uma quebra de linha.
	encoded := append(body, '\n')
	written, writeErr := w.Write(encoded)
	if writeErr != nil || written != len(encoded) {
		log.Printf("Falha de escrita JSON: status=%d bytes=%d esperados=%d", status, written, len(encoded))
	}
}

// Padroniza as respostas de sucesso.
func Success(w http.ResponseWriter, status int, message string, data any) {

	JSON(w, status, APIResponse{
		Success: true,
		Message: message,
		Data:    data,
	})
}

// Padroniza as respostas de erro.
func Error(w http.ResponseWriter, status int, message string) {

	JSON(w, status, APIResponse{
		Message: message,
	})
}
