package config

import (
	"fmt"
	"os"
)

type Config struct {
	Port              string
	DatabaseURL       string
	AccessTokenKey    string
	AccessCookieName  string
	RefreshCookieName string
	CookieSecure      bool
}

func Load() (Config, error) {
	cfg := Config{
		Port:              value("APP_PORT", "8080"),
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		AccessTokenKey:    os.Getenv("ACCESS_TOKEN_KEY"),
		AccessCookieName:  "clientops_access",
		RefreshCookieName: "clientops_refresh",
		CookieSecure:      os.Getenv("COOKIE_SECURE") == "true",
	}
	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.AccessTokenKey == "" {
		return Config{}, fmt.Errorf("ACCESS_TOKEN_KEY is required")
	}
	return cfg, nil
}

func value(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
