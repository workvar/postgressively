package pgctl

import (
	"os"
	"path/filepath"
	"time"

	"github.com/postggresively/agent/internal/config"
)

// logGlobs are the conventional Postgres log locations, covering Debian/RHEL
// packages and both Homebrew prefixes on macOS.
var logGlobs = []string{
	"/var/log/postgresql/*.log",
	"/var/lib/pgsql/data/log/*.log",
	"/opt/homebrew/var/log/postgres*.log",
	"/usr/local/var/log/postgres*.log",
}

// findLogFile returns the most recently modified candidate log file, or "".
func findLogFile(cfg *config.Config) string {
	globs := logGlobs
	if cfg.PGDataDir != "" {
		globs = append([]string{
			filepath.Join(cfg.PGDataDir, "log", "*.log"),
			filepath.Join(cfg.PGDataDir, "pg_log", "*.log"),
		}, globs...)
	}

	var newest string
	var newestAt time.Time
	for _, g := range globs {
		matches, err := filepath.Glob(g)
		if err != nil {
			continue
		}
		for _, path := range matches {
			info, err := os.Stat(path)
			if err != nil || info.IsDir() {
				continue
			}
			if newest == "" || info.ModTime().After(newestAt) {
				newest, newestAt = path, info.ModTime()
			}
		}
	}
	return newest
}
