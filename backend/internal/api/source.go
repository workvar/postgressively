package api

import (
	"net/http"
	"strconv"

	"github.com/postggresively/backend/internal/conns"
	"github.com/postggresively/backend/internal/pg"
)

// Data routes are scoped by two query parameters:
//
//   - ?conn=<id> picks a saved connection. Absent, or "local", means the
//     Postgres instance this console was installed next to.
//   - ?db=<name> picks a database on whichever connection was chosen.
//
// LocalConnection is the reserved id for the built-in instance.
const LocalConnection = "local"

// sourceFor resolves both parameters to something the browsing and query
// handlers can use, whatever engine is behind it.
func (s *Server) sourceFor(r *http.Request) (conns.Source, error) {
	id := r.URL.Query().Get("conn")
	database := r.URL.Query().Get("db")

	if id == "" || id == LocalConnection {
		return s.dbs.Store(r.Context(), database)
	}
	n, err := strconv.ParseInt(id, 10, 64)
	if err != nil {
		return nil, errBadConnection
	}
	return s.registry.Source(r.Context(), n, database)
}

// storeFor is sourceFor narrowed to Postgres, for the endpoints that need
// Postgres-only machinery: the row editor, database administration, activity.
func (s *Server) storeFor(r *http.Request) (*pg.Store, error) {
	src, err := s.sourceFor(r)
	if err != nil {
		return nil, err
	}
	store, ok := src.(*pg.Store)
	if !ok {
		return nil, errNotPostgres
	}
	return store, nil
}

// connectionScope names the connection a request targeted, for the audit log.
func connectionScope(r *http.Request) string {
	if id := r.URL.Query().Get("conn"); id != "" {
		return id
	}
	return LocalConnection
}
