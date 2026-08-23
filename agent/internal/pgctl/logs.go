package pgctl

import (
	"context"
	"errors"
	"fmt"
	"os/exec"
	"strings"
	"time"

	"github.com/postggresively/agent/internal/config"
)

// Logs reads recent Postgres log lines. It prefers an explicit log file, then
// journald on systemd hosts, then the conventional on-disk log locations.
func Logs(ctx context.Context, cfg *config.Config, lines int) (map[string]any, error) {
	if cfg.LogFile != "" {
		return tailFile(ctx, cfg.LogFile, lines)
	}
	if _, err := exec.LookPath("journalctl"); err == nil {
		out, err := run(ctx, 10*time.Second, "journalctl", "-u", cfg.ServiceName, "-n", fmt.Sprint(lines), "--no-pager")
		if err == nil {
			return result("journalctl:"+cfg.ServiceName, out), nil
		}
	}
	if path := findLogFile(cfg); path != "" {
		return tailFile(ctx, path, lines)
	}
	return nil, errors.New(
		"no Postgres log source found; set AGENT_PG_LOG_FILE to the log path on this host",
	)
}

func tailFile(ctx context.Context, path string, lines int) (map[string]any, error) {
	out, err := run(ctx, 10*time.Second, "tail", "-n", fmt.Sprint(lines), path)
	if err != nil {
		return nil, errors.New(joinErr(out, err))
	}
	return result(path, out), nil
}

func result(source, out string) map[string]any {
	body := []string{}
	if out != "" {
		body = strings.Split(out, "\n")
	}
	return map[string]any{"source": source, "lines": body}
}
