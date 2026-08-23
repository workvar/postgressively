package api

import (
	"net/http"

	"github.com/postggresively/backend/internal/auth"
)

// issueElevated mints the short-lived token that unlocks one critical action.
func (s *Server) issueElevated(w http.ResponseWriter, r *http.Request, method string) {
	token, exp, err := auth.IssueElevated(s.cfg.JWTSecret, subject(r))
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	s.audit(r, "stepup.confirmed", subject(r), map[string]any{"method": method})
	writeJSON(w, http.StatusOK, map[string]any{
		"elevatedToken": token,
		"expiresAt":     exp,
		"method":        method,
	})
}

// POST /api/stepup/password
func (s *Server) handleStepUpPassword(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Password string `json:"password"`
	}
	if err := decode(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}

	user, err := s.currentUser(r)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "account no longer exists")
		return
	}
	if !auth.CheckPassword(user.PasswordHash, req.Password) {
		s.audit(r, "stepup.failed", user.Username, map[string]any{"method": "password"})
		writeErr(w, http.StatusUnauthorized, "password is incorrect")
		return
	}

	s.issueElevated(w, r, "password")
}

// POST /api/stepup/passkey/begin
func (s *Server) handleStepUpPasskeyBegin(w http.ResponseWriter, r *http.Request) {
	if !s.passkeysEnabled(w) {
		return
	}
	options, sessionID, err := s.passkeys.BeginAssertion(r.Context())
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"sessionId": sessionID, "options": options})
}

// POST /api/stepup/passkey/finish. The passkey must belong to the account that
// is already signed in, otherwise anyone with a valid key of their own could
// elevate someone else's session.
func (s *Server) handleStepUpPasskeyFinish(w http.ResponseWriter, r *http.Request) {
	if !s.passkeysEnabled(w) {
		return
	}
	var req finishRequest
	if err := decode(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}

	user, err := s.passkeys.FinishAssertion(r.Context(), req.SessionID, req.Credential)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, err.Error())
		return
	}
	if user.Username != subject(r) {
		writeErr(w, http.StatusForbidden, "that passkey belongs to a different account")
		return
	}

	s.issueElevated(w, r, "passkey")
}
