package pgctl

import (
	"context"
	"encoding/json"
	"errors"
	"strings"
	"time"

	"github.com/postggresively/agent/internal/config"
)

// brewManager controls Postgres through `brew services`, the usual way Postgres
// runs on macOS. Homebrew wraps launchd, so this covers launchctl too.
type brewManager struct {
	cfg *config.Config

	resolved string // cached formula name, e.g. "postgresql@16"
}

type brewService struct {
	Name    string `json:"name"`
	Running bool   `json:"running"`
	Loaded  bool   `json:"loaded"`
	Status  string `json:"status"`
}

func (m *brewManager) Name() string { return "brew-services" }

func (m *brewManager) State(ctx context.Context) (string, string) {
	svc, err := m.info(ctx)
	if err != nil || svc == nil {
		return "unknown", "unknown"
	}
	active := "inactive"
	if svc.Running {
		active = "active"
	}
	enabled := "disabled"
	if svc.Loaded {
		enabled = "enabled"
	}
	return active, enabled
}

func (m *brewManager) Control(ctx context.Context, action string) (string, error) {
	name, err := m.formula(ctx)
	if err != nil {
		return "", err
	}

	// `brew services` has no reload verb. Prefer a real SIGHUP via pg_ctl and
	// fall back to a restart when pg_ctl is unavailable.
	if action == "reload" {
		if p := pgCtlPath(m.cfg); p != "" && m.cfg.PGDataDir != "" {
			return (&pgCtlManager{cfg: m.cfg}).Control(ctx, "reload")
		}
		action = "restart"
	}

	out, err := run(ctx, 90*time.Second, "brew", "services", action, name)
	if err != nil {
		return out, errors.New(joinErr(out, err))
	}
	return out, nil
}

// formula resolves the configured service name to a Homebrew formula, allowing
// a bare "postgresql" to match a versioned install like "postgresql@16".
func (m *brewManager) formula(ctx context.Context) (string, error) {
	if m.resolved != "" {
		return m.resolved, nil
	}
	svc, err := m.info(ctx)
	if err != nil {
		return "", err
	}
	if svc == nil {
		return "", errors.New("no Homebrew service matching " + m.cfg.ServiceName)
	}
	m.resolved = svc.Name
	return svc.Name, nil
}

func (m *brewManager) info(ctx context.Context) (*brewService, error) {
	out, err := run(ctx, 30*time.Second, "brew", "services", "list", "--json")
	if err != nil {
		return nil, errors.New(joinErr(out, err))
	}
	var list []brewService
	if err := json.Unmarshal([]byte(out), &list); err != nil {
		return nil, err
	}

	want := strings.TrimSuffix(m.cfg.ServiceName, ".service")
	for i := range list {
		if list[i].Name == want {
			return &list[i], nil
		}
	}
	for i := range list { // fall back to a versioned formula, e.g. postgresql@16
		if strings.HasPrefix(list[i].Name, want+"@") {
			return &list[i], nil
		}
	}
	return nil, nil
}
