package api

import (
	"log"
	"net/http"
	"strconv"
)

// audit records an action performed by the request's authenticated user.
func (s *Server) audit(r *http.Request, action, target string, detail map[string]any) {
	s.auditAs(r, subject(r), action, target, detail)
}

// auditAs records an action for an explicit actor, used where the session
// context is not established yet (sign-in attempts, for example).
func (s *Server) auditAs(r *http.Request, actor, action, target string, detail map[string]any) {
	if actor == "" {
		actor = "anonymous"
	}
	if err := s.meta.Audit(r.Context(), actor, action, target, detail); err != nil {
		log.Printf("audit %s: %v", action, err)
	}
}

// GET /api/audit
func (s *Server) handleAuditTail(w http.ResponseWriter, r *http.Request) {
	limit := 100
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil {
			limit = n
		}
	}
	entries, err := s.meta.AuditTail(r.Context(), limit)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, entries)
}
