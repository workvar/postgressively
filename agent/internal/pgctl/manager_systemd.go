package pgctl

import (
	"context"
	"errors"
	"time"

	"github.com/postggresively/agent/internal/config"
)

// systemdManager controls Postgres through systemctl on Linux hosts.
type systemdManager struct{ cfg *config.Config }

func (m *systemdManager) Name() string { return "systemd" }

func (m *systemdManager) State(ctx context.Context) (string, string) {
	active, _ := run(ctx, 5*time.Second, "systemctl", "is-active", m.cfg.ServiceName)
	enabled, _ := run(ctx, 5*time.Second, "systemctl", "is-enabled", m.cfg.ServiceName)
	return active, enabled
}

func (m *systemdManager) Control(ctx context.Context, action string) (string, error) {
	out, err := run(ctx, 60*time.Second, "systemctl", action, m.cfg.ServiceName)
	if err != nil {
		return out, errors.New(joinErr(out, err))
	}
	return out, nil
}
