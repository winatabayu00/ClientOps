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
	RedisAddr         string
	MinIOEndpoint     string
	MinIOAccessKey    string
	MinIOSecretKey    string
	MinIOBucket       string
	SMTPURL           string
}

func Load() (Config, error) {
	cfg := Config{
		Port:              value("APP_PORT", "8080"),
		DatabaseURL:       os.Getenv("DATABASE_URL"),
		AccessTokenKey:    os.Getenv("ACCESS_TOKEN_KEY"),
		AccessCookieName:  "clientops_access",
		RefreshCookieName: "clientops_refresh",
		CookieSecure:      os.Getenv("COOKIE_SECURE") == "true",
		RedisAddr:         os.Getenv("REDIS_ADDR"),
		MinIOEndpoint:     os.Getenv("MINIO_ENDPOINT"),
		MinIOAccessKey:    os.Getenv("MINIO_ACCESS_KEY"),
		MinIOSecretKey:    os.Getenv("MINIO_SECRET_KEY"),
		MinIOBucket:       value("MINIO_BUCKET", "clientops"),
		SMTPURL:           os.Getenv("SMTP_URL"),
	}
	if cfg.DatabaseURL == "" {
		return Config{}, fmt.Errorf("DATABASE_URL is required")
	}
	if cfg.AccessTokenKey == "" {
		return Config{}, fmt.Errorf("ACCESS_TOKEN_KEY is required")
	}
	if cfg.MinIOEndpoint == "" || cfg.MinIOAccessKey == "" || cfg.MinIOSecretKey == "" {
		return Config{}, fmt.Errorf("MINIO_ENDPOINT, MINIO_ACCESS_KEY, and MINIO_SECRET_KEY are required")
	}
	return cfg, nil
}

func value(key, fallback string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return fallback
}
