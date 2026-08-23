package api

import (
	"log"
	"net/http"
	"strings"
	"time"

	"github.com/postggresively/backend/internal/auth"
)

// ElevatedHeader carries the short-lived step-up token for critical actions.
const ElevatedHeader = "X-Elevated-Token"

func (s *Server) withCORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		w.Header().Set("Access-Control-Allow-Origin", s.cfg.CORSOrigin)
		w.Header().Set("Access-Control-Allow-Headers", "Authorization, Content-Type, "+ElevatedHeader)
		w.Header().Set("Access-Control-Allow-Methods", "GET, POST, PATCH, DELETE, OPTIONS")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusNoContent)
			return
		}
		next.ServeHTTP(w, r)
	})
}

func withLogging(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		start := time.Now()
		next.ServeHTTP(w, r)
		log.Printf("%s %s %s", r.Method, r.URL.Path, time.Since(start))
	})
}

// requireAuth rejects requests without a valid bearer token. When a valid
// step-up token also rides along, the request is additionally marked elevated
// so handlers that gate only part of their work can check for it.
func (s *Server) requireAuth(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		h := r.Header.Get("Authorization")
		if !strings.HasPrefix(h, "Bearer ") {
			writeErr(w, http.StatusUnauthorized, "missing bearer token")
			return
		}
		sub, err := auth.Parse(s.cfg.JWTSecret, strings.TrimPrefix(h, "Bearer "))
		if err != nil {
			writeErr(w, http.StatusUnauthorized, "invalid token")
			return
		}

		r = withSubject(r, sub)
		if s.hasElevation(r, sub) {
			r = withElevated(r)
		}
		next(w, r)
	}
}

// requireElevated guards destructive actions: dropping a database, deleting
// rows, killing a backend, removing a passkey. The caller must hold a session
// token and a step-up token issued in the last few minutes for the same user.
func (s *Server) requireElevated(next http.HandlerFunc) http.HandlerFunc {
	return s.requireAuth(func(w http.ResponseWriter, r *http.Request) {
		if !elevated(r) {
			writeJSON(w, http.StatusForbidden, map[string]any{
				"error":         "this action needs confirmation",
				"needsStepUp":   true,
				"passkeysReady": s.passkeys != nil,
			})
			return
		}
		next(w, r)
	})
}

// hasElevation validates the step-up header against the session's own subject,
// so one account's confirmation can never authorise another's action.
func (s *Server) hasElevation(r *http.Request, sub string) bool {
	token := r.Header.Get(ElevatedHeader)
	if token == "" {
		return false
	}
	who, err := auth.ParseElevated(s.cfg.JWTSecret, token)
	return err == nil && who == sub
}
