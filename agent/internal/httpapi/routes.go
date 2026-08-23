package httpapi

import (
	"net/http"
	"strconv"

	"github.com/postggresively/agent/internal/discover"
	"github.com/postggresively/agent/internal/pgctl"
	"github.com/postggresively/agent/internal/sysstat"
)

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()

	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})

	mux.HandleFunc("GET /v1/status", s.requireToken(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, s.service.Status(r.Context()))
	}))

	mux.HandleFunc("GET /v1/stats", s.requireToken(func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, sysstat.Snapshot(s.cfg.BackupDir))
	}))

	mux.HandleFunc("GET /v1/discover", s.requireToken(func(w http.ResponseWriter, r *http.Request) {
		found := discover.Scan(r.Context(), discover.Options{
			Host:        s.cfg.PGHost,
			ManagedPort: s.cfg.PGPort,
		})
		writeJSON(w, http.StatusOK, map[string]any{"instances": found})
	}))

	mux.HandleFunc("POST /v1/service/{action}", s.requireToken(func(w http.ResponseWriter, r *http.Request) {
		out, err := s.service.Control(r.Context(), r.PathValue("action"))
		if err != nil {
			writeErr(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, out)
	}))

	mux.HandleFunc("GET /v1/backups", s.requireToken(func(w http.ResponseWriter, r *http.Request) {
		out, err := s.backups.List()
		if err != nil {
			writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, out)
	}))

	mux.HandleFunc("POST /v1/backups", s.requireToken(func(w http.ResponseWriter, r *http.Request) {
		var body struct {
			Database string `json:"database"`
		}
		if err := decodeBody(r, &body); err != nil {
			writeErr(w, http.StatusBadRequest, "invalid body")
			return
		}
		out, err := s.backups.Create(r.Context(), body.Database)
		if err != nil {
			writeErr(w, http.StatusBadRequest, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, out)
	}))

	mux.HandleFunc("GET /v1/logs", s.requireToken(func(w http.ResponseWriter, r *http.Request) {
		lines := 200
		if v := r.URL.Query().Get("lines"); v != "" {
			if n, err := strconv.Atoi(v); err == nil && n > 0 && n <= 2000 {
				lines = n
			}
		}
		out, err := pgctl.Logs(r.Context(), s.cfg, lines)
		if err != nil {
			writeErr(w, http.StatusInternalServerError, err.Error())
			return
		}
		writeJSON(w, http.StatusOK, out)
	}))

	return mux
}
