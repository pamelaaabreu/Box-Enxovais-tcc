// main.go

package main

import (
	"backend/src/config"
	"backend/src/db"
	"backend/src/handlers"
	"backend/src/models"
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
	// verifica o diretório de trabalho da aplicaçãoo evitando problemas na localização de arquivos
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
	// context: ciclo de vida
	database, err := db.Open(context.Background(), cfg.Database)
	if err != nil {
		return err
	}
	defer database.Close()

	// Injeção de dependências: conecta o banco de dados ao repository,
	// o repository aos services e os services aos handlers,
	// mantendo a separação de responsabilidades entre as camadas.

	// Contas e autenticação.
	userRepository := repositories.UserRepository{DB: database}
	userService := services.UserService{Store: userRepository}
	users := handlers.UserHandler{Service: userService}
	authService := services.AuthService{Store: userRepository, JWTSecret: cfg.JWTSecret}
	auth := handlers.AuthHandler{Service: authService}
	accountRepository := repositories.AccountRepository{DB: database}
	account := handlers.AccountHandler{Store: accountRepository}

	// Catálogo, galeria, dashboard e relatórios utilizam as dependências do catálogo.
	productRepository := repositories.ProductRepository{DB: database}
	productService := services.ProductService{Store: productRepository}
	products := handlers.ProductHandler{Service: productService}
	imageRepository := repositories.ProductImageRepository{DB: database}
	imageService := services.ProductImageService{Store: imageRepository, Directory: cfg.UploadDir}
	images := handlers.ProductImageHandler{Service: imageService}

	// Campanhas, conteúdos da Home e avaliações.
	promotionRepository := repositories.PromotionRepository{DB: database}
	promotionService := services.PromotionService{Store: promotionRepository, UploadDir: cfg.UploadDir}
	promotions := handlers.PromotionHandler{Service: promotionService}
	homeRepository := repositories.HomeRepository{DB: database}
	home := handlers.HomeHandler{Store: homeRepository}

	// Favoritos e carrinho, incluindo recompra de pedidos.
	favoritesRepository := repositories.FavoritesRepository{DB: database}
	favoritesService := services.FavoritesService{Store: favoritesRepository}
	favorites := handlers.FavoritesHandler{Service: favoritesService}
	cartRepository := repositories.CartRepository{DB: database}
	cart := handlers.CartHandler{Store: cartRepository}

	// Checkout e histórico compartilham o mesmo repository.
	checkoutRepository := repositories.CheckoutRepository{DB: database}
	checkout := handlers.CheckoutHandler{
		Store: checkoutRepository,
		Notify: func(userID int, order models.CheckoutOrder) {
			// Utiliza uma goroutine para enviar o e-mail de forma concorrente, sem bloquear o processamento da requisição.
			go services.SendCheckoutReceipt(database, userID, order)
		},
	}
	orderHistory := handlers.OrderHistoryHandler{
		Store: checkoutRepository,
		NotifyCancelled: func(userID int, order models.OrderDetails) {
			go services.SendOrderCancellation(database, userID, order)
		},
	}
	adminOrders := handlers.AdminOrdersHandler{Store: checkoutRepository, NotifyCancelled: orderHistory.NotifyCancelled}
	adminCustomerRepository := repositories.AdminCustomerRepository{DB: database}
	adminCustomerService := services.AdminCustomerService{Store: adminCustomerRepository}
	adminCustomers := handlers.AdminCustomerHandler{Service: adminCustomerService}

	// Frete preserva os handlers existentes, preparados fora da camada de rotas.
	quoteShipping := handlers.QuoteShipping(database)
	listShippingRanges := handlers.ListShippingRanges(database)
	saveShippingRange := handlers.SaveShippingRange(database)
	deleteShippingRange := handlers.DeleteShippingRange(database)

	// Inscrições de newsletter.
	subscriberRepository := repositories.SubscriberRepository{DB: database}
	newsletterService := services.NewsletterService{Store: subscriberRepository}
	newsletter := handlers.NewsletterHandler{Service: newsletterService}

	// Inicializa o roteador HTTP; cada funcionalidade centraliza seus endpoints em routes.
	mux := http.NewServeMux()
	routes.InitRoutesUploads(mux, cfg.UploadDir)
	routes.InitRoutesAuth(mux, auth, users)
	routes.InitRoutesAccount(mux, account)
	routes.InitRoutesCart(mux, cart)
	routes.InitRoutesCheckout(mux, checkout)
	routes.InitRoutesOrders(mux, orderHistory)
	routes.InitRoutesFavorites(mux, favorites)
	routes.InitRoutesProducts(mux, products, images)
	routes.InitRoutesDashboard(mux, products)
	routes.InitRoutesReports(mux, products)
	routes.InitRoutesAdminCustomers(mux, adminCustomers)
	routes.InitRoutesAdminOrders(mux, adminOrders)
	routes.InitRoutesHome(mux, home)
	routes.InitRoutesReviews(mux, home)
	routes.InitRoutesShipping(mux, quoteShipping, listShippingRanges, saveShippingRange, deleteShippingRange)
	routes.InitRoutesNewsletter(mux, newsletter)
	routes.InitRoutesPromotions(mux, promotions, products)

	// instância da struct Server
	server := &http.Server{
		Addr:              cfg.HTTPAddr,
		Handler:           enableCORS(mux, cfg.CORSOrigin),
		ReadHeaderTimeout: cfg.ReadHeaderTimeout,
		ReadTimeout:       cfg.ReadTimeout,
		WriteTimeout:      cfg.WriteTimeout,
		IdleTimeout:       cfg.IdleTimeout,
	}

	// deteca solicitação de cancelamento da aplicação.
	signalContext, stop := signal.NotifyContext(
		context.Background(),
		os.Interrupt,
		syscall.SIGTERM,
	)
	defer stop()

	// canal que permite comunicação de go routines; <- operador de comunicação
	serverErrors := make(chan error, 1)
	go func() {
		// inicializa o servidor HTTP
		serverErrors <- server.ListenAndServe()
	}()
	log.Printf("Servidor HTTP iniciando em %s", cfg.HTTPAddr)

	// select: estrutura nativa que guarda operações em múltiplos channels
	select {
	case err := <-serverErrors:
		if errors.Is(err, http.ErrServerClosed) {
			return nil
		}
		return fmt.Errorf("falha no servidor HTTP: %w", err)
	// quando um contexto é cancelado
	case <-signalContext.Done():

		stop()
	}

	log.Println("Encerrando o servidor HTTP")
	// servidor tem tempo limite para concluir as requisições antes que o servidor encerre.
	shutdownContext, cancel := context.WithTimeout(context.Background(), cfg.ShutdownTimeout)
	defer cancel()

	// Realiza o encerramento gracioso, permitindo que as requisições em andamento sejam concluídas.
	if err := server.Shutdown(shutdownContext); err != nil {
		// força fechamento se shutdown falhar
		if closeErr := server.Close(); closeErr != nil {
			log.Println("Falha ao fechar as conexoes HTTP restantes")
		}
		return fmt.Errorf("falha ao encerrar o servidor HTTP: %w", err)
	}
	return nil
}
