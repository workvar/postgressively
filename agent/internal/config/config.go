package config

import (
	"errors"
	"os"
	"strconv"
)

// Config for the on-server agent. Stdlib only: no external dependencies.
type Config struct {
	Addr        string
	Token       string
	ServiceName string
	// ServiceManager selects the init system: auto, systemd, brew, or pgctl.
	ServiceManager string
	BackupDir      string
	PGBinDir       string
	// PGDataDir is required by the pg_ctl backend and used to locate logs.
	PGDataDir string
	PGHost    string
	PGPort    int
	PGUser    string
	LogFile   string
	AllowCtl  bool
}

func Load() (*Config, error) {
	c := &Config{
		Addr:           env("AGENT_ADDR", "127.0.0.1:8081"),
		Token:          os.Getenv("AGENT_TOKEN"),
		ServiceName:    env("AGENT_PG_SERVICE", "postgresql"),
		ServiceManager: env("AGENT_SERVICE_MANAGER", "auto"),
		BackupDir:      env("AGENT_BACKUP_DIR", "/var/backups/postggresively"),
		PGBinDir:       env("AGENT_PG_BIN_DIR", ""),
		PGDataDir:      env("AGENT_PG_DATA_DIR", ""),
		PGHost:         env("AGENT_PG_HOST", "127.0.0.1"),
		PGPort:         envInt("AGENT_PG_PORT", 5432),
		PGUser:         env("AGENT_PG_USER", "postgres"),
		LogFile:        env("AGENT_PG_LOG_FILE", ""),
		AllowCtl:       env("AGENT_ALLOW_SERVICE_CONTROL", "true") == "true",
	}
	if len(c.Token) < 32 {
		return nil, errors.New("AGENT_TOKEN is required and must be at least 32 characters")
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
