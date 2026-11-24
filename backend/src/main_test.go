package main

import (
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestCORSPreflight(t *testing.T) {
	for _, path := range []string{"/checkout", "/admin/products/42", "/unknown"} {
		t.Run(path, func(t *testing.T) {
			reached := false
			next := http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) { reached = true; w.WriteHeader(204) })
			handler := enableCORS(next, "http://localhost:4200")
			request := httptest.NewRequest(http.MethodOptions, path, nil)
			request.Header.Set("Origin", "http://localhost:4200")
			request.Header.Set("Access-Control-Request-Method", http.MethodPatch)
			response := httptest.NewRecorder()
			handler.ServeHTTP(response, request)
			if response.Code != 200 || reached {
				t.Fatal("preflight must be handled before routing/authentication")
			}
			if response.Header().Get("Access-Control-Allow-Origin") != "http://localhost:4200" || response.Header().Get("Access-Control-Allow-Headers") != "Content-Type, Authorization" || response.Header().Get("Access-Control-Allow-Methods") != "POST, GET, OPTIONS, PUT, PATCH, DELETE" {
				t.Fatal("CORS contract changed")
			}
			response = httptest.NewRecorder()
			handler.ServeHTTP(response, httptest.NewRequest(http.MethodGet, path, nil))
			if !reached || response.Code != 204 {
				t.Fatal("non-preflight request must continue to routing")
			}
		})
	}
}
