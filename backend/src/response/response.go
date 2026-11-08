package response

import (
	"encoding/json"
	"log"
	"net/http"
)

type APIResponse struct {
	Success bool   `json:"success"`
	Message string `json:"message,omitempty"`
	Data    any    `json:"data,omitempty"`
}

func JSON(w http.ResponseWriter, status int, payload any) {
	body, err := json.Marshal(payload)
	if err != nil {
		log.Println("Could not encode HTTP response")
		status = http.StatusInternalServerError
		body, _ = json.Marshal(APIResponse{Message: "Erro interno do servidor"})
	}
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if _, err := w.Write(append(body, '\n')); err != nil {
		log.Println("Could not write HTTP response")
	}
}

func Success(w http.ResponseWriter, status int, message string, data any) {
	JSON(w, status, APIResponse{Success: true, Message: message, Data: data})
}

func Error(w http.ResponseWriter, status int, message string) {
	JSON(w, status, APIResponse{Message: message})
}
