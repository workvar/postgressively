package api

import (
	"net/http"
	"strings"

	"github.com/postggresively/backend/internal/pg"
)

// handleAgentStatus merges the agent's view of the service with facts read from
// the live connection. The agent may be unable to exec local binaries or reach
// an init system, but if we can query Postgres then it is demonstrably running.
func (s *Server) handleAgentStatus(w http.ResponseWriter, r *http.Request) {
	status, agentErr := s.agent.Status(r.Context())
	if status == nil {
		status = map[string]any{}
	}

	info, infoErr := s.store.ServerInfo(r.Context())
	if infoErr != nil && agentErr != nil {
		writeErr(w, http.StatusBadGateway, agentErr.Error())
		return
	}
	if info != nil {
		mergeServerInfo(status, info)
	}
	if agentErr != nil {
		status["agentError"] = agentErr.Error()
	}
	writeJSON(w, http.StatusOK, status)
}

// mergeServerInfo fills in anything the agent could not determine on its own.
func mergeServerInfo(status map[string]any, info *pg.ServerInfo) {
	if blank(status["version"]) {
		status["version"] = "PostgreSQL " + info.Version
	}
	if blank(status["host"]) {
		status["host"] = info.Host
	}
	if _, ok := status["port"]; !ok {
		status["port"] = info.Port
	}
	// A successful query outranks an init system that reported nothing useful.
	if blank(status["active"]) || status["active"] == "unknown" {
		status["active"] = "active"
	}
	if blank(status["service"]) {
		status["service"] = "postgresql"
	}

	status["versionNum"] = info.VersionNum
	status["startedAt"] = info.StartedAt
	status["uptimeSeconds"] = info.UptimeSecond
	if info.DataDir != "" {
		status["dataDir"] = info.DataDir
	}
}

func blank(v any) bool {
	s, ok := v.(string)
	return !ok || strings.TrimSpace(s) == ""
}
