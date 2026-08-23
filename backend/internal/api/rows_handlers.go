package api

import (
	"errors"
	"net/http"

	"github.com/postggresively/backend/internal/pg"
)

// POST /api/tables/{schema}/{table}/rows applies a batch of grid edits.
//
// The grid sends everything the user changed since the last save. A dry run
// returns the generated script without committing, which is what the preview
// panel shows. Batches that delete rows additionally require a step-up token,
// so an unattended tab cannot be used to destroy data.
func (s *Server) handleRowChanges(w http.ResponseWriter, r *http.Request) {
	if s.cfg.ReadOnly {
		writeErr(w, http.StatusForbidden, "server is in read-only mode")
		return
	}

	var cs pg.ChangeSet
	if err := decode(r, &cs); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	cs.Schema = r.PathValue("schema")
	cs.Table = r.PathValue("table")

	if len(cs.Rows) == 0 {
		writeErr(w, http.StatusBadRequest, "no changes to apply")
		return
	}
	if cs.HasDeletes() && !cs.DryRun && !elevated(r) {
		writeJSON(w, http.StatusForbidden, map[string]any{
			"error":       "deleting rows needs confirmation",
			"needsStepUp": true,
		})
		return
	}

	store, err := s.storeFor(r)
	if err != nil {
		writePostgresOnly(w, err)
		return
	}

	res, err := store.ApplyChanges(r.Context(), cs)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, pg.ErrNoPrimaryKey) {
			status = http.StatusConflict
		}
		writeErr(w, status, err.Error())
		return
	}

	if res.Applied {
		s.audit(r, "rows.changed", cs.Schema+"."+cs.Table, map[string]any{
			"connection": connectionScope(r),
			"database":   r.URL.Query().Get("db"),
			"inserts":    res.Inserts,
			"updates":    res.Updates,
			"deletes":    res.Deletes,
		})
	}
	writeJSON(w, http.StatusOK, res)
}
