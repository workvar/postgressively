package api

import (
	"errors"
	"net/http"

	"github.com/postggresively/backend/internal/pg"
)

// GET /api/databases/details
func (s *Server) handleDatabaseDetails(w http.ResponseWriter, r *http.Request) {
	store, err := s.storeFor(r)
	if err != nil {
		writePostgresOnly(w, err)
		return
	}
	details, err := store.DatabaseDetails(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, details)
}

// POST /api/databases
func (s *Server) handleDatabaseCreate(w http.ResponseWriter, r *http.Request) {
	var spec pg.CreateDatabaseSpec
	if err := decode(r, &spec); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid request body")
		return
	}

	if err := spec.Validate(); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}

	res, err := s.store.CreateDatabase(r.Context(), spec)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	s.audit(r, "database.created", res.Name, map[string]any{"owner": res.Owner})
	writeJSON(w, http.StatusCreated, res)
}

// DELETE /api/databases/{name}. Guarded by requireElevated: the caller must
// have re-confirmed their identity within the last few minutes.
func (s *Server) handleDatabaseDrop(w http.ResponseWriter, r *http.Request) {
	name := r.PathValue("name")
	if name == s.dbs.MetaName() {
		writeErr(w, http.StatusForbidden, "refusing to drop the console's own database")
		return
	}
	if err := s.store.DropDatabase(r.Context(), name); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	s.audit(r, "database.dropped", name, nil)
	writeJSON(w, http.StatusOK, map[string]string{"dropped": name})
}

// GET /api/databases/{name}/extensions
func (s *Server) handleDatabaseExtensions(w http.ResponseWriter, r *http.Request) {
	store, err := s.storeFor(r)
	if err != nil {
		writePostgresOnly(w, err)
		return
	}
	exts, err := store.Extensions(r.Context(), r.PathValue("name"))
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, exts)
}

// writePostgresOnly reports a feature that has no equivalent on the selected
// engine as 501 rather than as a bad request, so the UI can hide it instead of
// showing an error.
func writePostgresOnly(w http.ResponseWriter, err error) {
	if errors.Is(err, errNotPostgres) {
		writeErr(w, http.StatusNotImplemented, err.Error())
		return
	}
	writeErr(w, http.StatusBadRequest, err.Error())
}
