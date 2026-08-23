package auth

import (
	"errors"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

// TokenTTL is the lifetime of a normal session token.
const TokenTTL = 12 * time.Hour

// ElevatedTTL is how long a step-up confirmation stays valid. It is short on
// purpose: it covers one destructive action, not a whole session.
const ElevatedTTL = 5 * time.Minute

// Scopes distinguish an ordinary session from a freshly re-authenticated one.
const (
	ScopeSession  = "session"
	ScopeElevated = "elevated"
)

// ErrNotElevated marks a token that is valid but not a step-up confirmation.
var ErrNotElevated = errors.New("token is not an elevated confirmation")

type Claims struct {
	Scope string `json:"scope,omitempty"`
	jwt.RegisteredClaims
}

// Issue returns a signed session JWT for the given subject.
func Issue(secret, subject string) (string, time.Time, error) {
	return sign(secret, subject, ScopeSession, TokenTTL)
}

// IssueElevated returns a short-lived token proving the user just re-confirmed
// their identity. It is sent alongside the session token on critical calls.
func IssueElevated(secret, subject string) (string, time.Time, error) {
	return sign(secret, subject, ScopeElevated, ElevatedTTL)
}

func sign(secret, subject, scope string, ttl time.Duration) (string, time.Time, error) {
	exp := time.Now().Add(ttl)
	claims := Claims{
		Scope: scope,
		RegisteredClaims: jwt.RegisteredClaims{
			Subject:   subject,
			IssuedAt:  jwt.NewNumericDate(time.Now()),
			ExpiresAt: jwt.NewNumericDate(exp),
		},
	}
	tok := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	s, err := tok.SignedString([]byte(secret))
	return s, exp, err
}

// Parse validates a session token and returns its subject. Elevated tokens are
// rejected here so a step-up token cannot stand in for a session.
func Parse(secret, token string) (string, error) {
	claims, err := parseClaims(secret, token)
	if err != nil {
		return "", err
	}
	if claims.Scope == ScopeElevated {
		return "", errors.New("elevated token is not a session token")
	}
	return claims.Subject, nil
}

// ParseElevated validates a step-up token and returns its subject.
func ParseElevated(secret, token string) (string, error) {
	claims, err := parseClaims(secret, token)
	if err != nil {
		return "", err
	}
	if claims.Scope != ScopeElevated {
		return "", ErrNotElevated
	}
	return claims.Subject, nil
}

func parseClaims(secret, token string) (*Claims, error) {
	var claims Claims
	_, err := jwt.ParseWithClaims(token, &claims, func(t *jwt.Token) (interface{}, error) {
		if _, ok := t.Method.(*jwt.SigningMethodHMAC); !ok {
			return nil, errors.New("unexpected signing method")
		}
		return []byte(secret), nil
	})
	if err != nil {
		return nil, err
	}
	if claims.Subject == "" {
		return nil, errors.New("empty subject")
	}
	return &claims, nil
}
