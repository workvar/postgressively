package pgctl

import (
	"context"
	"errors"
	"os/exec"
	"path/filepath"
	"strings"

	"github.com/postggresively/agent/internal/config"
)

// serviceManager abstracts the init system used to control Postgres, so the
// agent works on systemd hosts, macOS (Homebrew), and bare pg_ctl installs.
type serviceManager interface {
	// Name identifies the backend, e.g. "systemd".
	Name() string
	// State returns the active and enabled strings for the unit.
	State(ctx context.Context) (active string, enabled string)
	// Control performs start/stop/restart/reload and returns command output.
	Control(ctx context.Context, action string) (string, error)
}

// errNoManager is returned when no supported init system was detected.
var errNoManager = errors.New(
	"no supported service manager found on this host " +
		"(looked for systemctl, brew, and pg_ctl); " +
		"set AGENT_SERVICE_MANAGER and AGENT_PG_BIN_DIR to configure one",
)

// newManager picks a backend from cfg.ServiceManager, auto-detecting when unset.
func newManager(cfg *config.Config) (serviceManager, error) {
	switch strings.ToLower(cfg.ServiceManager) {
	case "systemd", "systemctl":
		return &systemdManager{cfg: cfg}, nil
	case "brew", "homebrew", "launchctl", "launchd":
		return &brewManager{cfg: cfg}, nil
	case "pgctl", "pg_ctl":
		return &pgCtlManager{cfg: cfg}, nil
	case "", "auto":
		return detectManager(cfg)
	default:
		return nil, errors.New("unknown AGENT_SERVICE_MANAGER: " + cfg.ServiceManager)
	}
}

func detectManager(cfg *config.Config) (serviceManager, error) {
	if _, err := exec.LookPath("systemctl"); err == nil {
		return &systemdManager{cfg: cfg}, nil
	}
	if _, err := exec.LookPath("brew"); err == nil {
		return &brewManager{cfg: cfg}, nil
	}
	if pgCtlPath(cfg) != "" {
		return &pgCtlManager{cfg: cfg}, nil
	}
	return nil, errNoManager
}

// binPath resolves a Postgres binary, preferring the configured bin dir and
// falling back to $PATH. Returns "" when the binary cannot be found.
func binPath(cfg *config.Config, name string) string {
	if cfg.PGBinDir != "" {
		candidate := filepath.Join(cfg.PGBinDir, name)
		if info, err := exec.LookPath(candidate); err == nil {
			return info
		}
	}
	if p, err := exec.LookPath(name); err == nil {
		return p
	}
	return ""
}

func pgCtlPath(cfg *config.Config) string { return binPath(cfg, "pg_ctl") }
