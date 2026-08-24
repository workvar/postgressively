package config

import (
	"errors"
	"os"
	"strconv"
	"strings"
	"time"
)

// Config holds all runtime settings, sourced from environment variables.
type Config struct {
	Addr         string
	DatabaseURL  string
	MetaDatabase string
	JWTSecret    string
	// SecretKey encrypts saved connection strings. It falls back to
	// JWTSecret so an existing install keeps working unchanged.
	SecretKey    string
	AgentURL     string
	AgentToken   string
	CORSOrigin   string
	ReadOnly     bool
	MaxRows      int
	QueryTimeout time.Duration

	// WebAuthn (passkeys). RPID must be the registrable domain the UI is
	// served from; RPOrigins must list the exact origins the browser sends.
	RPID          string
	RPDisplayName string
	RPOrigins     []string

	// DataDir holds files the console needs locally rather than in
	// Postgres -- today just the telemetry queue (internal/telemetry).
	// Relative to the backend's working directory, matching the
	// no-root/no-/var/lib philosophy of the rest of the deploy story.
	DataDir string

	// InstallKind is "pm2", "docker", or empty (unknown / source install).
	// Set by the release bundle or compose file; never required for boot.
	InstallKind string
	// InstallRoot is the PM2 bundle directory or Docker Compose project dir.
	InstallRoot string
}

func Load() (*Config, error) {
	c := &Config{
		Addr:          env("PG_ADDR", ":8080"),
		DatabaseURL:   os.Getenv("PG_DATABASE_URL"),
		MetaDatabase:  env("PG_META_DATABASE", "postggresively"),
		JWTSecret:     os.Getenv("PG_JWT_SECRET"),
		SecretKey:     os.Getenv("PG_SECRET_KEY"),
		AgentURL:      env("PG_AGENT_URL", "http://127.0.0.1:8081"),
		AgentToken:    os.Getenv("PG_AGENT_TOKEN"),
		CORSOrigin:    env("PG_CORS_ORIGIN", "http://localhost:3000"),
		ReadOnly:      env("PG_READ_ONLY", "false") == "true",
		MaxRows:       envInt("PG_MAX_ROWS", 500),
		QueryTimeout:  time.Duration(envInt("PG_QUERY_TIMEOUT_SECONDS", 30)) * time.Second,
		RPID:          env("PG_WEBAUTHN_RPID", "localhost"),
		RPDisplayName: env("PG_WEBAUTHN_NAME", "Postggresively"),

		DataDir:     env("PG_DATA_DIR", "./data"),
		InstallKind: strings.ToLower(strings.TrimSpace(env("PG_INSTALL_KIND", ""))),
		InstallRoot: env("PG_INSTALL_ROOT", ""),
	}
	c.RPOrigins = splitList(env("PG_WEBAUTHN_ORIGINS", c.CORSOrigin))

	if c.DatabaseURL == "" {
		return nil, errors.New("PG_DATABASE_URL is required")
	}
	if c.JWTSecret == "" {
		return nil, errors.New("PG_JWT_SECRET is required")
	}
	if c.SecretKey == "" {
		c.SecretKey = c.JWTSecret
	}
	return c, nil
}

func env(k, def string) string {
	if v := os.Getenv(k); v != "" {
		return v
	}
	return def
}

func envInt(k string, def int) int {
	if v := os.Getenv(k); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			return n
		}
	}
	return def
}

func splitList(v string) []string {
	parts := strings.Split(v, ",")
	out := make([]string, 0, len(parts))
	for _, p := range parts {
		if s := strings.TrimSpace(p); s != "" {
			out = append(out, s)
		}
	}
	return out
}
