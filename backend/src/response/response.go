package response

import (
	"encoding/json"
	"log"
	"net/http"
)

// Estrutura padronizada das respostas da API.
type APIResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Data    any    `json:"data,omitempty"`
}

// Converte os dados em JSON e envia a resposta HTTP.
func JSON(w http.ResponseWriter, status int, payload any) {

	// Converte os dados em um slice de bytes.
	body, err := json.Marshal(payload)

	// Caso a conversão falhe, retorna um erro interno.
	if err != nil {
		log.Println("Could not encode HTTP response")

		status = http.StatusInternalServerError

		body, _ = json.Marshal(APIResponse{
			Message: "Erro interno do servidor",
		})
	}

	// Informa que a resposta contém JSON.
	w.Header().Set("Content-Type", "application/json")

	// Define o código HTTP.
	w.WriteHeader(status)

	// Escreve o conteúdo, acrescentando uma quebra de linha.
	if _, err := w.Write(append(body, '\n')); err != nil {
		log.Println("Could not write HTTP response")
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
