package api

import (
	"errors"
	"net/http"
	"strings"

	"github.com/postggresively/backend/internal/auth"
	"github.com/postggresively/backend/internal/pg"
)

type setupRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// handleSetupStatus is public: the web app calls it before showing any screen
// so a fresh install lands on the setup wizard instead of a login form.
func (s *Server) handleSetupStatus(w http.ResponseWriter, r *http.Request) {
	n, err := s.meta.CountUsers(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"needsSetup": n == 0})
}

// handleSetup creates the first console account and signs it straight in.
// It is public by necessity, and refuses once any account exists.
func (s *Server) handleSetup(w http.ResponseWriter, r *http.Request) {
	var req setupRequest
	if err := decode(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}

	username := strings.TrimSpace(req.Username)
	if err := auth.ValidateUsername(username); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}
	if err := auth.ValidatePassword(req.Password); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}

	hash, err := auth.HashPassword(req.Password)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}

	user, err := s.meta.CreateFirstUser(r.Context(), username, hash)
	if err != nil {
		if errors.Is(err, pg.ErrAlreadySetup) {
			writeErr(w, http.StatusConflict, "console is already set up")
			return
		}
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.auditAs(r, user.Username, "setup.complete", user.Username, nil)
	s.issueSession(w, user.Username, http.StatusCreated)
}
