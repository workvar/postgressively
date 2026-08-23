package api

import (
	"net/http"
	"strconv"

	"github.com/postggresively/backend/internal/pg"
)

// GET /api/databases lists the databases on the selected connection.
func (s *Server) handleDatabases(w http.ResponseWriter, r *http.Request) {
	src, err := s.sourceFor(r)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	dbs, err := src.Databases(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	def := src.CurrentDatabase()
	if _, local := src.(*pg.Store); local && connectionScope(r) == LocalConnection {
		def = s.dbs.DefaultName()
	}
	for i := range dbs {
		dbs[i].IsDefault = dbs[i].Name == def
	}
	writeJSON(w, http.StatusOK, dbs)
}

func (s *Server) handleTables(w http.ResponseWriter, r *http.Request) {
	src, err := s.sourceFor(r)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	tables, err := src.Tables(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, tables)
}

func (s *Server) handleTableDetail(w http.ResponseWriter, r *http.Request) {
	schema, table := r.PathValue("schema"), r.PathValue("table")
	src, err := s.sourceFor(r)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	cols, err := src.Columns(r.Context(), schema, table)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	idx, err := src.Indexes(r.Context(), schema, table)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{
		"schema":   schema,
		"table":    table,
		"columns":  cols,
		"indexes":  idx,
		"engine":   src.Engine(),
		"editable": src.Editable(),
	})
}

// handleTableRows previews rows. The statement is built by the engine's own
// dialect, so identifiers are quoted the way that engine expects.
func (s *Server) handleTableRows(w http.ResponseWriter, r *http.Request) {
	schema, table := r.PathValue("schema"), r.PathValue("table")
	src, err := s.sourceFor(r)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	res, err := src.Preview(r.Context(), schema, table, s.rowLimit(r), s.queryOptions(true))
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, res)
}

// rowLimit honours ?limit=, capped by PG_MAX_ROWS.
func (s *Server) rowLimit(r *http.Request) int {
	if v := r.URL.Query().Get("limit"); v != "" {
		if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= s.cfg.MaxRows {
			return n
		}
	}
	return s.cfg.MaxRows
}

func (s *Server) queryOptions(readOnly bool) pg.QueryOptions {
	return pg.QueryOptions{
		MaxRows:  s.cfg.MaxRows,
		Timeout:  s.cfg.QueryTimeout,
		ReadOnly: readOnly || s.cfg.ReadOnly,
	}
}
