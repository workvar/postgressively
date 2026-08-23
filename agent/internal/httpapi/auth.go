package httpapi

import (
	"crypto/subtle"
	"net/http"
	"strings"
)

// requireToken enforces a constant-time bearer token check.
func (s *Server) requireToken(next http.HandlerFunc) http.HandlerFunc {
	return func(w http.ResponseWriter, r *http.Request) {
		got := strings.TrimPrefix(r.Header.Get("Authorization"), "Bearer ")
		if subtle.ConstantTimeCompare([]byte(got), []byte(s.cfg.Token)) != 1 {
			writeErr(w, http.StatusUnauthorized, "invalid agent token")
			return
		}
		next(w, r)
	}
}
