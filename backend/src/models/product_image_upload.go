package models

// DTO de resposta da imagem
type UploadResponse struct {
	Message  string `json:"message"`
	FilePath string `json:"filePath"`
}
