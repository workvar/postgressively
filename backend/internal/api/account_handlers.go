package api

import (
	"errors"
	"net/http"

	"github.com/postggresively/backend/internal/auth"
	"github.com/postggresively/backend/internal/pg"
)

type passwordRequest struct {
	CurrentPassword string `json:"currentPassword"`
	NewPassword     string `json:"newPassword"`
}

// handlePasswordChange lets the signed-in account rotate its own password.
func (s *Server) handlePasswordChange(w http.ResponseWriter, r *http.Request) {
	var req passwordRequest
	if err := decode(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}

	user, err := s.currentUser(r)
	if errors.Is(err, pg.ErrNoUser) {
		writeErr(w, http.StatusUnauthorized, "account no longer exists")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}

	if !auth.CheckPassword(user.PasswordHash, req.CurrentPassword) {
		writeErr(w, http.StatusUnauthorized, "current password is incorrect")
		return
	}
	if req.NewPassword == req.CurrentPassword {
		writeErr(w, http.StatusBadRequest, "new password must differ from the current one")
		return
	}
	if err := auth.ValidatePassword(req.NewPassword); err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}

	hash, err := auth.HashPassword(req.NewPassword)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	if err := s.meta.SetPassword(r.Context(), user.Username, hash); err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}

	s.audit(r, "account.password_changed", user.Username, nil)

	// Hand back a fresh token so the current tab stays signed in.
	s.issueSession(w, user.Username, http.StatusOK)
}
