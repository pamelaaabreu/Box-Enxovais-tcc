// main.go

package main

import (
	"backend/src/config"
	"backend/src/db"
	"backend/src/handlers"
	"backend/src/repositories"
	"backend/src/routes"
	"backend/src/services"
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"path/filepath"
	"syscall"

	"github.com/sendgrid/sendgrid-go"
)

func enableCORS(next http.Handler, origin string) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", origin)
		w.Header().Set("Access-Control-Allow-Methods", "POST, GET, OPTIONS, PUT, PATCH, DELETE")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func main() {
	if err := run(); err != nil {
		log.Print(err)
		os.Exit(1)
	}
}

func run() error {
	// Keep .env, uploads and templates relative to backend when started from src.
	if _, err := os.Stat("go.mod"); errors.Is(err, os.ErrNotExist) {
		if info, err := os.Stat(filepath.Join("..", "go.mod")); err == nil && !info.IsDir() {
			if err := os.Chdir(".."); err != nil {
				return errors.New("não foi possível acessar a raiz do backend")
			}
		}
	}

	cfg, err := config.Load()
	if err != nil {
		return err
	}

	database, err := db.Open(context.Background(), cfg.Database)
	if err != nil {
		return err
	}
	defer database.Close()

	userRepository := repositories.UserRepository{DB: database}
	users := handlers.UserHandler{Service: services.UserService{Store: userRepository}}
	auth := handlers.AuthHandler{Service: services.AuthService{
		Store: userRepository, JWTSecret: cfg.JWTSecret,
	}}

	products := handlers.ProductHandler{Service: services.ProductService{
		Store: repositories.ProductRepository{DB: database},
	}}
	images := handlers.ProductImageHandler{Service: services.ProductImageService{
		Store: repositories.ProductImageRepository{DB: database}, Directory: cfg.UploadDir,
	}}
	promotions := handlers.PromotionHandler{Service: services.PromotionService{
		Store: repositories.PromotionRepository{DB: database},
	}}

	favorites := handlers.FavoritesHandler{Service: services.FavoritesService{
		Store: repositories.FavoritesRepository{DB: database},
	}}
	cart := handlers.CartHandler{Store: repositories.CartRepository{DB: database}}
	var newsletterClient *sendgrid.Client
	if cfg.SendGridAPIKey != "" {
		newsletterClient = sendgrid.NewSendClient(cfg.SendGridAPIKey)
	}
	newsletter := handlers.NewsletterHandler{Service: services.NewsletterService{
		Store: repositories.SubscriberRepository{DB: database}, Client: newsletterClient,
	}}

	mux := http.NewServeMux()

	fs := http.FileServer(http.Dir(cfg.UploadDir))
	mux.Handle("/uploads/", http.StripPrefix("/uploads/", fs))

	routes.InitRoutesAuth(mux, auth, users)
	routes.InitRoutesCart(mux, cart)
	routes.InitRoutesFavorites(mux, favorites)
	routes.InitRoutesProducts(mux, products, images)
	routes.InitRoutesNewsletter(mux, newsletter)
	routes.InitRoutesPromotions(mux, promotions, products)

	server := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           enableCORS(mux, cfg.CORSOrigin),
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
		ReadTimeout:       cfg.ReadTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
	}

	signalContext, stop := signal.NotifyContext(context.Background(), os.Interrupt, syscall.SIGTERM)
	defer stop()
	serverErrors := make(chan error, 1)
	go func() {
		serverErrors <- server.ListenAndServe()
	}()
	log.Printf("Servidor HTTP iniciando em %s", cfg.HTTPAddr)

	select {
	case err := <-serverErrors:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("falha no servidor HTTP: %w", err)
	case <-signalContext.Done():
		// Restore signal handling so another interrupt can force an immediate exit.
		stop()
	}

	log.Println("Encerrando o servidor HTTP")
	shutdownContext, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()
	if err := server.Shutdown(shutdownContext); err != nil {
		if closeErr := server.Close(); closeErr != nil {
			log.Println("Falha ao fechar as conexoes HTTP restantes")
		}
		return fmt.Errorf("falha ao encerrar o servidor HTTP: %w", err)
	}
	return nil
}
