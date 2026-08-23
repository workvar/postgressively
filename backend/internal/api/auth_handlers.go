package api

import (
	"errors"
	"log"
	"net/http"

	"github.com/postggresively/backend/internal/auth"
	"github.com/postggresively/backend/internal/pg"
)

type loginRequest struct {
	Username string `json:"username"`
	Password string `json:"password"`
}

// issueSession signs a JWT for username and writes it as the response body.
func (s *Server) issueSession(w http.ResponseWriter, username string, status int) {
	token, exp, err := auth.Issue(s.cfg.JWTSecret, username)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, status, map[string]any{
		"token":     token,
		"expiresAt": exp,
		"username":  username,
	})
}

func (s *Server) handleLogin(w http.ResponseWriter, r *http.Request) {
	var req loginRequest
	if err := decode(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}

	// A fresh install has no accounts yet; steer the client to the wizard.
	n, err := s.meta.CountUsers(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	if n == 0 {
		writeErr(w, http.StatusConflict, "setup required")
		return
	}

	user, err := s.meta.FindUser(r.Context(), req.Username)
	if errors.Is(err, pg.ErrNoUser) {
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	if !auth.CheckPassword(user.PasswordHash, req.Password) {
		s.audit(r, "login.failed", user.Username, nil)
		writeErr(w, http.StatusUnauthorized, "invalid credentials")
		return
	}

	s.afterLogin(r, user, "password")
	s.issueSession(w, user.Username, http.StatusOK)
}

// afterLogin records the sign-in. Bookkeeping never blocks the response.
func (s *Server) afterLogin(r *http.Request, user *pg.User, method string) {
	if err := s.meta.TouchLogin(r.Context(), user.ID); err != nil {
		log.Printf("touch login: %v", err)
	}
	s.auditAs(r, user.Username, "login", user.Username, map[string]any{"method": method})
}

func (s *Server) handleMe(w http.ResponseWriter, r *http.Request) {
	writeJSON(w, http.StatusOK, map[string]any{
		"username":     subject(r),
		"readOnly":     s.cfg.ReadOnly,
		"maxRows":      s.cfg.MaxRows,
		"metaDatabase": s.dbs.MetaName(),
		"passkeys":     s.passkeys != nil,
	})
}

// currentUser loads the account behind the request's session token.
func (s *Server) currentUser(r *http.Request) (*pg.User, error) {
	return s.meta.FindUser(r.Context(), subject(r))
}
