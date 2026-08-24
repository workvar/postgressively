package api

import (
	"errors"
	"net/http"
	"strconv"

	"github.com/postggresively/backend/internal/conns"
	"github.com/postggresively/backend/internal/engine"
)

var (
	errBadConnection = errors.New("invalid connection id")
	errNotPostgres   = errors.New("this feature is only available on PostgreSQL connections")
	errNoConnections = errors.New("saved connections are unavailable: no encryption key is configured")
)

// GET /api/engines lists the engines the console can connect to, with an
// example connection string and which features each supports.
func (s *Server) handleEngines(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, engine.Descriptors())
}

// GET /api/connections
func (s *Server) handleConnectionList(w http.ResponseWriter, r *http.Request) {
	if s.conns == nil {
		writeErr(w, http.StatusServiceUnavailable, errNoConnections.Error())
		return
	}
	list, err := s.conns.List(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, list)
}

// POST /api/connections/test dials a connection string without saving it.
func (s *Server) handleConnectionTest(w http.ResponseWriter, r *http.Request) {
	var spec conns.Spec
	if err := decode(r, &spec); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	// A failed dial is a result, not an error: the form shows it inline.
	res := conns.Test(r.Context(), spec, s.cfg.QueryTimeout)
	if res.OK {
		s.telemetry.Track("connection_success", map[string]any{"latency_ms": res.Elapsed})
	} else {
		s.telemetry.Track("connection_failed", map[string]any{"error_category": errorCategory(res.Error)})
	}
	writeJSON(w, http.StatusOK, res)
}

// POST /api/connections saves a connection after proving it works.
func (s *Server) handleConnectionCreate(w http.ResponseWriter, r *http.Request) {
	if s.conns == nil {
		writeErr(w, http.StatusServiceUnavailable, errNoConnections.Error())
		return
	}
	var spec conns.Spec
	if err := decode(r, &spec); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	if res := conns.Test(r.Context(), spec, s.cfg.QueryTimeout); !res.OK {
		writeJSON(w, http.StatusBadRequest, map[string]any{"error": res.Error, "test": res})
		return
	}

	created, err := s.conns.Create(r.Context(), spec, subject(r))
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	s.audit(r, "connection.created", created.Name, map[string]any{
		"engine": created.Engine, "endpoint": created.Endpoint,
	})
	s.telemetry.Track("connection_created", map[string]any{"engine": created.Engine})
	writeJSON(w, http.StatusCreated, created)
}

// PATCH /api/connections/{id} renames a connection, and replaces its
// connection string when a new one is supplied.
func (s *Server) handleConnectionUpdate(w http.ResponseWriter, r *http.Request) {
	id, ok := s.connectionID(w, r)
	if !ok {
		return
	}
	var spec conns.Spec
	if err := decode(r, &spec); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}

	updated, err := s.conns.Update(r.Context(), id, spec, subject(r))
	if err != nil {
		writeConnectionErr(w, err)
		return
	}
	s.registry.Forget(id)
	s.audit(r, "connection.updated", updated.Name, map[string]any{"engine": updated.Engine})
	writeJSON(w, http.StatusOK, updated)
}

// DELETE /api/connections/{id}. Guarded by requireElevated: forgetting a
// connection loses the only copy of its password.
func (s *Server) handleConnectionDelete(w http.ResponseWriter, r *http.Request) {
	id, ok := s.connectionID(w, r)
	if !ok {
		return
	}
	existing, err := s.conns.Get(r.Context(), id)
	if err != nil {
		writeConnectionErr(w, err)
		return
	}
	if err := s.conns.Delete(r.Context(), id); err != nil {
		writeConnectionErr(w, err)
		return
	}
	s.registry.Forget(id)
	s.audit(r, "connection.deleted", existing.Name, map[string]any{"engine": existing.Engine})
	writeJSON(w, http.StatusOK, map[string]string{"deleted": existing.Name})
}

// connectionID parses the path id and confirms the feature is available.
func (s *Server) connectionID(w http.ResponseWriter, r *http.Request) (int64, bool) {
	if s.conns == nil {
		writeErr(w, http.StatusServiceUnavailable, errNoConnections.Error())
		return 0, false
	}
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, errBadConnection.Error())
		return 0, false
	}
	return id, true
}

func writeConnectionErr(w http.ResponseWriter, err error) {
	if errors.Is(err, conns.ErrNotFound) {
		writeErr(w, http.StatusNotFound, err.Error())
		return
	}
	writeErr(w, http.StatusBadRequest, err.Error())
}
