package config

import (
	"backend/src/db"
	"errors"
	"fmt"
	"os"
	"strconv"
	"strings"
	"time"

	"github.com/joho/godotenv"
)

type Config struct {
	Database          db.Config
	HTTPAddr          string
	CORSOrigin        string
	UploadDir         string
	JWTSecret         string
	SendGridAPIKey    string
	ReadHeaderTimeout time.Duration
	ReadTimeout       time.Duration
	WriteTimeout      time.Duration
	IdleTimeout       time.Duration
	ShutdownTimeout   time.Duration
}

func Load(envFiles ...string) (Config, error) {
	if err := godotenv.Load(envFiles...); err != nil {
		if errors.Is(err, os.ErrNotExist) {
			return Config{}, errors.New("arquivo .env obrigatório não encontrado")
		}
		return Config{}, errors.New("não foi possível carregar o arquivo .env")
	}

	cfg := Config{
		HTTPAddr:       envOrDefault("HTTP_ADDR", ":8080"),
		CORSOrigin:     envOrDefault("CORS_ORIGIN", "http://localhost:4200"),
		UploadDir:      envOrDefault("UPLOAD_DIR", "./uploads"),
		JWTSecret:      os.Getenv("JWT_SECRET"),
		SendGridAPIKey: os.Getenv("SENDGRID_API_KEY"),
		Database: db.Config{
			Host:     strings.TrimSpace(os.Getenv("DB_HOST")),
			User:     strings.TrimSpace(os.Getenv("DB_USER")),
			Password: os.Getenv("DB_PASSWORD"),
			Name:     strings.TrimSpace(os.Getenv("DB_NAME")),
			SSLMode:  envOrDefault("DB_SSLMODE", "disable"),
		},
	}
	missing := []string{}
	for _, field := range []struct{ name, value string }{
		{"DB_HOST", cfg.Database.Host},
		{"DB_PORT", os.Getenv("DB_PORT")},
		{"DB_USER", cfg.Database.User},
		{"DB_PASSWORD", cfg.Database.Password},
		{"DB_NAME", cfg.Database.Name},
	} {
		if strings.TrimSpace(field.value) == "" {
			missing = append(missing, field.name)
		}
	}
	if len(missing) > 0 {
		return Config{}, fmt.Errorf("configure os campos obrigatórios do banco: %s", strings.Join(missing, ", "))
	}
	port, err := strconv.Atoi(os.Getenv("DB_PORT"))
	if err != nil || port < 1 || port > 65535 {
		return Config{}, errors.New("DB_PORT deve ser um inteiro entre 1 e 65535")
	}
	cfg.Database.Port = port
	switch cfg.Database.SSLMode {
	case "disable", "require", "verify-ca", "verify-full":
	default:
		return Config{}, errors.New("DB_SSLMODE deve ser disable, require, verify-ca ou verify-full")
	}

	for _, timeout := range []struct {
		name     string
		fallback time.Duration
		target   *time.Duration
	}{
		{"HTTP_READ_HEADER_TIMEOUT", 5 * time.Second, &cfg.ReadHeaderTimeout},
		{"HTTP_READ_TIMEOUT", 30 * time.Second, &cfg.ReadTimeout},
		{"HTTP_WRITE_TIMEOUT", 60 * time.Second, &cfg.WriteTimeout},
		{"HTTP_IDLE_TIMEOUT", 120 * time.Second, &cfg.IdleTimeout},
		{"HTTP_SHUTDOWN_TIMEOUT", 15 * time.Second, &cfg.ShutdownTimeout},
		{"DB_CONNECT_TIMEOUT", 5 * time.Second, &cfg.Database.ConnectTimeout},
	} {
		value := os.Getenv(timeout.name)
		if value == "" {
			*timeout.target = timeout.fallback
			continue
		}
		duration, err := time.ParseDuration(value)
		if err != nil || duration <= 0 {
			return Config{}, fmt.Errorf("%s deve ser uma duração positiva, por exemplo 15s", timeout.name)
		}
		*timeout.target = duration
	}

	return cfg, nil
}

func envOrDefault(name, fallback string) string {
	if value := os.Getenv(name); value != "" {
		return value
	}
	return fallback
}
