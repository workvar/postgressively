package pgctl

import (
	"context"
	"errors"
	"time"

	"github.com/postggresively/agent/internal/config"
)

// Service controls the local Postgres instance through whichever init system
// the host provides. See serviceManager for the supported backends.
type Service struct {
	cfg *config.Config
	mgr serviceManager
	err error // deferred detection failure, surfaced on use
}

func NewService(cfg *config.Config) *Service {
	mgr, err := newManager(cfg)
	return &Service{cfg: cfg, mgr: mgr, err: err}
}

var validActions = map[string]bool{"start": true, "stop": true, "restart": true, "reload": true}

// Status reports whether Postgres is running plus how it is being managed.
func (s *Service) Status(ctx context.Context) map[string]any {
	active, enabled := "unknown", "unknown"
	manager := "none"
	if s.mgr != nil {
		active, enabled = s.mgr.State(ctx)
		manager = s.mgr.Name()
	}

	status := map[string]any{
		"service":    s.cfg.ServiceName,
		"manager":    manager,
		"active":     active,
		"enabled":    enabled,
		"version":    s.version(ctx),
		"host":       s.cfg.PGHost,
		"port":       s.cfg.PGPort,
		"canControl": s.cfg.AllowCtl && s.mgr != nil,
	}
	if s.err != nil {
		status["managerError"] = s.err.Error()
	}
	return status
}

// Control runs start/stop/restart/reload on the instance.
func (s *Service) Control(ctx context.Context, action string) (map[string]any, error) {
	if !validActions[action] {
		return nil, errors.New("unsupported action")
	}
	if !s.cfg.AllowCtl {
		return nil, errors.New("service control is disabled on this agent")
	}
	if s.mgr == nil {
		return nil, s.err
	}

	out, err := s.mgr.Control(ctx, action)
	if err != nil {
		return nil, err
	}
	return map[string]any{
		"action":  action,
		"manager": s.mgr.Name(),
		"output":  out,
		"status":  s.Status(ctx),
	}, nil
}

func (s *Service) version(ctx context.Context) string {
	bin := binPath(s.cfg, "postgres")
	if bin == "" {
		return ""
	}
	out, err := run(ctx, 5*time.Second, bin, "--version")
	if err != nil {
		return ""
	}
	return out
}
