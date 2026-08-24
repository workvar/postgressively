package api

import (
	"net/http"

	"github.com/postggresively/backend/internal/telemetry"
)

type telemetryResponse struct {
	Enabled          bool `json:"enabled"`
	ProductAnalytics bool `json:"productAnalytics"`
	UIAnalytics      bool `json:"uiAnalytics"`
	// Configured reports whether this build even has GA4 credentials to
	// send to. The web UI uses it to explain a toggle that would otherwise
	// look like it does nothing.
	Configured bool `json:"configured"`
}

// GET /api/telemetry. Public: the web UI needs this on /login and /setup,
// before a session exists, to decide whether to load Clarity.
func (s *Server) handleTelemetryGet(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, s.telemetryResponse())
}

// POST /api/telemetry updates the operator's preferences.
func (s *Server) handleTelemetrySet(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Enabled          bool `json:"enabled"`
		ProductAnalytics bool `json:"productAnalytics"`
		UIAnalytics      bool `json:"uiAnalytics"`
	}
	if err := decode(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}

	next := telemetry.Settings{Enabled: req.Enabled, ProductAnalytics: req.ProductAnalytics, UIAnalytics: req.UIAnalytics}
	if err := s.telemetry.SetSettings(next); err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.audit(r, "telemetry.updated", "", map[string]any{
		"enabled": next.Enabled, "productAnalytics": next.ProductAnalytics, "uiAnalytics": next.UIAnalytics,
	})
	writeJSON(w, http.StatusOK, s.telemetryResponse())
}

func (s *Server) telemetryResponse() telemetryResponse {
	set := s.telemetry.GetSettings()
	return telemetryResponse{
		Enabled:          set.Enabled,
		ProductAnalytics: set.ProductAnalytics,
		UIAnalytics:      set.UIAnalytics,
		Configured:       s.telemetry.Configured(),
	}
}
