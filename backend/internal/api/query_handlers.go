package api

import (
	"net/http"
	"strconv"

	"github.com/postggresively/backend/internal/pg"
)

type queryRequest struct {
	SQL string `json:"sql"`
	// Database picks the target for this run. Empty means the default. The
	// ?db= query parameter is honoured too, so links stay shareable.
	Database string `json:"db"`
}

// POST /api/query runs one or more statements against the chosen database.
func (s *Server) handleQuery(w http.ResponseWriter, r *http.Request) {
	var req queryRequest
	if err := decode(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if req.Database == "" {
		req.Database = r.URL.Query().Get("db")
	}

	// sourceFor reads ?db=, so mirror the body's choice onto the URL.
	if req.Database != "" && r.URL.Query().Get("db") == "" {
		q := r.URL.Query()
		q.Set("db", req.Database)
		r.URL.RawQuery = q.Encode()
	}

	src, err := s.sourceFor(r)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}

	stmts := pg.SplitStatements(req.SQL)
	if len(stmts) == 0 {
		writeErr(w, http.StatusBadRequest, "empty statement")
		return
	}
	s.telemetry.Track("feature_used", map[string]any{"feature_name": "query_console"})

	results := make([]*pg.QueryResult, 0, len(stmts))
	for _, stmt := range stmts {
		res, err := src.Run(r.Context(), stmt, s.queryOptions(false))
		if err != nil {
			writeJSON(w, http.StatusBadRequest, map[string]any{
				"error":     err.Error(),
				"statement": stmt,
				"results":   results,
				"database":  req.Database,
			})
			return
		}
		results = append(results, res)
	}

	if !pg.IsReadOnly(req.SQL) {
		s.audit(r, "query.write", req.Database, map[string]any{
			"statements": len(stmts),
			"connection": connectionScope(r),
			"engine":     src.Engine(),
		})
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"results":  results,
		"database": req.Database,
		"engine":   src.Engine(),
	})
}

// GET /api/completions returns the identifiers the SQL console offers as
// type-ahead for the selected database.
func (s *Server) handleCompletions(w http.ResponseWriter, r *http.Request) {
	source, err := s.sourceFor(r)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	src, err := source.Completions(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, src)
}

func (s *Server) handleActivity(w http.ResponseWriter, r *http.Request) {
	acts, err := s.store.Activity(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, acts)
}

func (s *Server) handleTerminate(w http.ResponseWriter, r *http.Request) {
	if s.cfg.ReadOnly {
		writeErr(w, http.StatusForbidden, "server is in read-only mode")
		return
	}
	pid, err := strconv.Atoi(r.PathValue("pid"))
	if err != nil {
		writeErr(w, http.StatusBadRequest, "invalid pid")
		return
	}
	if err := s.store.Terminate(r.Context(), pid); err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.audit(r, "backend.terminated", strconv.Itoa(pid), nil)
	writeJSON(w, http.StatusOK, map[string]any{"terminated": pid})
}
