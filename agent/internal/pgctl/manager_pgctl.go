package pgctl

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/postggresively/agent/internal/config"
)

// pgCtlManager drives Postgres directly with pg_ctl. It is the fallback for
// hosts with no init-system integration and requires AGENT_PG_DATA_DIR.
type pgCtlManager struct{ cfg *config.Config }

func (m *pgCtlManager) Name() string { return "pg_ctl" }

func (m *pgCtlManager) State(ctx context.Context) (string, string) {
	bin := pgCtlPath(m.cfg)
	if bin == "" || m.cfg.PGDataDir == "" {
		return "unknown", "unknown"
	}
	out, err := run(ctx, 5*time.Second, bin, "status", "-D", m.cfg.PGDataDir)
	switch {
	case err == nil && strings.Contains(out, "server is running"):
		return "active", "unknown"
	case strings.Contains(out, "no server running"):
		return "inactive", "unknown"
	default:
		return "unknown", "unknown"
	}
}

func (m *pgCtlManager) Control(ctx context.Context, action string) (string, error) {
	bin := pgCtlPath(m.cfg)
	if bin == "" {
		return "", errors.New("pg_ctl not found; set AGENT_PG_BIN_DIR")
	}
	if m.cfg.PGDataDir == "" {
		return "", errors.New("pg_ctl requires AGENT_PG_DATA_DIR to be set")
	}

	args := []string{action, "-D", m.cfg.PGDataDir, "-s"}
	if action == "start" || action == "restart" {
		args = append(args, "-w", "-t", "60")
	}
	if m.cfg.LogFile != "" && (action == "start" || action == "restart") {
		args = append(args, "-l", m.cfg.LogFile)
	}

	out, err := run(ctx, 90*time.Second, bin, args...)
	if err != nil {
		return out, errors.New(joinErr(out, err))
	}
	if out == "" {
		out = action + " ok"
	}
	return out, nil
}
