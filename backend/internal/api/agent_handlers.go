package api

import (
	"net/http"
	"strconv"
	"time"
)

var allowedServiceActions = map[string]bool{
	"start": true, "stop": true, "restart": true, "reload": true,
}

func (s *Server) handleAgentStats(w http.ResponseWriter, r *http.Request) {
	s.proxy(w, func() (map[string]any, error) { return s.agent.Stats(r.Context()) })
}

func (s *Server) handleAgentDiscover(w http.ResponseWriter, r *http.Request) {
	s.proxy(w, func() (map[string]any, error) { return s.agent.Discover(r.Context()) })
}

func (s *Server) handleAgentService(w http.ResponseWriter, r *http.Request) {
	action := r.PathValue("action")
	if !allowedServiceActions[action] {
		writeErr(w, http.StatusBadRequest, "unsupported action")
		return
	}
	if s.cfg.ReadOnly {
		writeErr(w, http.StatusForbidden, "server is in read-only mode")
		return
	}
	s.telemetry.Track("feature_used", map[string]any{"feature_name": "service_control"})
	s.proxy(w, func() (map[string]any, error) { return s.agent.Service(r.Context(), action) })
}

func (s *Server) handleBackupsList(w http.ResponseWriter, r *http.Request) {
	s.proxy(w, func() (map[string]any, error) { return s.agent.Backups(r.Context()) })
}

func (s *Server) handleBackupCreate(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Database string `json:"database"`
	}
	if err := decode(r, &req); err != nil || req.Database == "" {
		writeErr(w, http.StatusBadRequest, "database is required")
		return
	}
	start := time.Now()
	s.proxy(w, func() (map[string]any, error) {
		out, err := s.agent.Backup(r.Context(), req.Database)
		s.telemetry.Track("backup_created", map[string]any{
			"success":     err == nil,
			"duration_ms": time.Since(start).Milliseconds(),
		})
		return out, err
	})
}

func (s *Server) handleAgentLogs(w http.ResponseWriter, r *http.Request) {
	lines := 200
	if v := r.URL.Query().Get("lines"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 2000 {
			lines = n
		}
	}
	s.proxy(w, func() (map[string]any, error) { return s.agent.Logs(r.Context(), lines) })
}

// proxy runs an agent call and renders the result or a bad-gateway error.
func (s *Server) proxy(w http.ResponseWriter, fn func() (map[string]any, error)) {
	out, err := fn()
	if err != nil {
		s.telemetry.Track("error", map[string]any{"component": "agent", "error_category": errorCategory(err.Error())})
		writeErr(w, http.StatusBadGateway, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, out)
}
