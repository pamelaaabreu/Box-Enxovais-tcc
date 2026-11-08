package db

import (
	"context"
	"database/sql"
	"errors"
	"fmt"
	"net"
	"net/url"
	"strconv"
	"time"

	_ "github.com/lib/pq"
)

type Config struct {
	Host           string
	Port           int
	User           string
	Password       string
	Name           string
	SSLMode        string
	ConnectTimeout time.Duration
}

func Open(ctx context.Context, cfg Config) (*sql.DB, error) {
	address := url.URL{
		Scheme: "postgres",
		User:   url.UserPassword(cfg.User, cfg.Password),
		Host:   net.JoinHostPort(cfg.Host, strconv.Itoa(cfg.Port)),
		Path:   "/" + cfg.Name,
	}
	options := url.Values{}
	options.Set("sslmode", cfg.SSLMode)
	seconds := int64(cfg.ConnectTimeout / time.Second)
	if cfg.ConnectTimeout%time.Second != 0 {
		seconds++
	}
	options.Set("connect_timeout", strconv.FormatInt(seconds, 10))
	address.RawQuery = options.Encode()
	database, err := sql.Open("postgres", address.String())
	if err != nil {
		return nil, errors.New("could not configure PostgreSQL connection")
	}
	connectContext, cancel := context.WithTimeout(ctx, cfg.ConnectTimeout)
	defer cancel()
	if err := database.PingContext(connectContext); err != nil {
		database.Close()
		if connectContext.Err() != nil {
			return nil, fmt.Errorf("PostgreSQL connection failed: %w", connectContext.Err())
		}
		// Driver errors may contain connection details. Never expose them in startup logs.
		return nil, errors.New("could not connect to PostgreSQL; check configuration and availability")
	}
	return database, nil
}
