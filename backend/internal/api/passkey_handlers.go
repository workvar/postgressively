package api

import (
	"encoding/json"
	"errors"
	"net/http"
	"strconv"
	"strings"

	"github.com/postggresively/backend/internal/pg"
)

// finishRequest is the shape every ceremony-completing call shares: the id of
// the challenge we handed out, plus the raw credential the browser produced.
type finishRequest struct {
	SessionID  string          `json:"sessionId"`
	Label      string          `json:"label"`
	Credential json.RawMessage `json:"credential"`
}

// passkeysEnabled guards every route that needs the WebAuthn service.
func (s *Server) passkeysEnabled(w http.ResponseWriter) bool {
	if s.passkeys == nil {
		writeErr(w, http.StatusServiceUnavailable, "passkeys are not configured on this server")
		return false
	}
	return true
}

// GET /api/passkeys
func (s *Server) handlePasskeyList(w http.ResponseWriter, r *http.Request) {
	user, err := s.currentUser(r)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "account no longer exists")
		return
	}
	creds, err := s.meta.Credentials(r.Context(), user.ID)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, creds)
}

// POST /api/passkeys/register/begin
func (s *Server) handlePasskeyRegisterBegin(w http.ResponseWriter, r *http.Request) {
	if !s.passkeysEnabled(w) {
		return
	}
	user, err := s.currentUser(r)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "account no longer exists")
		return
	}

	options, sessionID, err := s.passkeys.BeginRegistration(r.Context(), user)
	if err != nil {
		writeErr(w, http.StatusInternalServerError, err.Error())
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"sessionId": sessionID, "options": options})
}

// POST /api/passkeys/register/finish
func (s *Server) handlePasskeyRegisterFinish(w http.ResponseWriter, r *http.Request) {
	if !s.passkeysEnabled(w) {
		return
	}
	var req finishRequest
	if err := decode(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	user, err := s.currentUser(r)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "account no longer exists")
		return
	}

	label := strings.TrimSpace(req.Label)
	cred, err := s.passkeys.FinishRegistration(r.Context(), user, req.SessionID, label, req.Credential)
	if err != nil {
		writeErr(w, http.StatusBadRequest, err.Error())
		return
	}

	s.audit(r, "passkey.registered", cred.Label, nil)
	writeJSON(w, http.StatusCreated, cred)
}

// PATCH /api/passkeys/{id}
func (s *Server) handlePasskeyRename(w http.ResponseWriter, r *http.Request) {
	var req struct {
		Label string `json:"label"`
	}
	if err := decode(r, &req); err != nil {
		writeErr(w, http.StatusBadRequest, "invalid body")
		return
	}
	label := strings.TrimSpace(req.Label)
	if label == "" {
		writeErr(w, http.StatusBadRequest, "label is required")
		return
	}

	user, id, ok := s.passkeyTarget(w, r)
	if !ok {
		return
	}
	if err := s.meta.RenameCredential(r.Context(), user.ID, id, label); err != nil {
		s.writeCredentialErr(w, err)
		return
	}
	writeJSON(w, http.StatusOK, map[string]any{"id": id, "label": label})
}

// DELETE /api/passkeys/{id}. Removing a credential is itself a critical action,
// so this route sits behind requireElevated.
func (s *Server) handlePasskeyDelete(w http.ResponseWriter, r *http.Request) {
	user, id, ok := s.passkeyTarget(w, r)
	if !ok {
		return
	}
	if err := s.meta.DeleteCredential(r.Context(), user.ID, id); err != nil {
		s.writeCredentialErr(w, err)
		return
	}
	s.audit(r, "passkey.deleted", strconv.FormatInt(id, 10), nil)
	writeJSON(w, http.StatusOK, map[string]any{"deleted": id})
}

// passkeyTarget resolves the signed-in account and the {id} path value.
func (s *Server) passkeyTarget(w http.ResponseWriter, r *http.Request) (*pg.User, int64, bool) {
	user, err := s.currentUser(r)
	if err != nil {
		writeErr(w, http.StatusUnauthorized, "account no longer exists")
		return nil, 0, false
	}
	id, err := strconv.ParseInt(r.PathValue("id"), 10, 64)
	if err != nil {
		writeErr(w, http.StatusBadRequest, "invalid passkey id")
		return nil, 0, false
	}
	return user, id, true
}

func (s *Server) writeCredentialErr(w http.ResponseWriter, err error) {
	if errors.Is(err, pg.ErrNoCredential) {
		writeErr(w, http.StatusNotFound, "passkey not found")
		return
	}
	writeErr(w, http.StatusInternalServerError, err.Error())
}

// POST /api/login/passkey/begin (public)
func (s *Server) handlePasskeyLoginBegin(w http.ResponseWriter, r *http.Request) {
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

// POST /api/login/passkey/finish (public)
func (s *Server) handlePasskeyLoginFinish(w http.ResponseWriter, r *http.Request) {
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

	s.afterLogin(r, user, "passkey")
	s.issueSession(w, user.Username, http.StatusOK)
}
