package routes

import "net/http"

func InitRoutesUploads(mux *http.ServeMux, directory string) {
	// Converte o diretório para http.Dir e remove o prefixo antes de servir o arquivo.
	files := http.FileServer(http.Dir(directory))
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", files))
}
