package api

import (
	"context"
	"net/http"
)

type ctxKey int

const (
	subjectKey ctxKey = iota
	elevatedKey
)

// withSubject stores the authenticated username on the request context.
func withSubject(r *http.Request, username string) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), subjectKey, username))
}

// subject returns the authenticated username, or "" for unauthenticated routes.
func subject(r *http.Request) string {
	name, _ := r.Context().Value(subjectKey).(string)
	return name
}

// withElevated marks the request as carrying a valid step-up confirmation.
func withElevated(r *http.Request) *http.Request {
	return r.WithContext(context.WithValue(r.Context(), elevatedKey, true))
}

// elevated reports whether the caller re-confirmed their identity for this call.
func elevated(r *http.Request) bool {
	ok, _ := r.Context().Value(elevatedKey).(bool)
	return ok
}
