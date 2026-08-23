package passkey

import (
	"crypto/rand"
	"encoding/base64"
	"sync"
	"time"

	"github.com/go-webauthn/webauthn/webauthn"
)

// sessionTTL bounds how long a challenge stays usable.
const sessionTTL = 5 * time.Minute

type entry struct {
	data    *webauthn.SessionData
	expires time.Time
}

// SessionStore holds in-flight WebAuthn challenges.
//
// These are single-use and short-lived, so memory is the right home for them:
// a restart simply asks the user to tap their key again. It does mean a
// multi-process deployment needs sticky routing for the two-call ceremony.
type SessionStore struct {
	mu      sync.Mutex
	entries map[string]entry
}

func NewSessionStore() *SessionStore {
	return &SessionStore{entries: map[string]entry{}}
}

// Put stores session data and returns the opaque id the client echoes back.
func (s *SessionStore) Put(data *webauthn.SessionData) string {
	id := randomID()
	s.mu.Lock()
	defer s.mu.Unlock()
	s.sweepLocked()
	s.entries[id] = entry{data: data, expires: time.Now().Add(sessionTTL)}
	return id
}

// Take returns the session for id and removes it, so a challenge is used once.
func (s *SessionStore) Take(id string) (*webauthn.SessionData, bool) {
	s.mu.Lock()
	defer s.mu.Unlock()
	e, ok := s.entries[id]
	delete(s.entries, id)
	if !ok || time.Now().After(e.expires) {
		return nil, false
	}
	return e.data, true
}

func (s *SessionStore) sweepLocked() {
	now := time.Now()
	for id, e := range s.entries {
		if now.After(e.expires) {
			delete(s.entries, id)
		}
	}
}

func randomID() string {
	buf := make([]byte, 24)
	if _, err := rand.Read(buf); err != nil {
		// crypto/rand failing is fatal for auth; a time-based fallback would be
		// guessable, so panic rather than issue a weak challenge id.
		panic("passkey: cannot read random bytes: " + err.Error())
	}
	return base64.RawURLEncoding.EncodeToString(buf)
}
