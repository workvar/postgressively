package httpapi

import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/postggresively/agent/internal/config"
	"github.com/postggresively/agent/internal/pgctl"
)

// Server exposes the agent's local control API.
type Server struct {
	cfg     *config.Config
	service *pgctl.Service
	backups *pgctl.Backups
}

func New(cfg *config.Config) *Server {
	return &Server{
		cfg:     cfg,
		service: pgctl.NewService(cfg),
		backups: pgctl.NewBackups(cfg),
	}
}

func writeJSON(w http.ResponseWriter, status int, v any) {
	w.Header().Set("Content-Type", "application/json")
	w.WriteHeader(status)
	if v != nil {
		if err := json.NewEncoder(w).Encode(v); err != nil {
			log.Printf("write json: %v", err)
		}
	}
}

func writeErr(w http.ResponseWriter, status int, msg string) {
	writeJSON(w, status, map[string]string{"error": msg})
}

func decodeBody(r *http.Request, v any) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}
