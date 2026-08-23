package pg

import (
	"context"
	"time"
)

// AuditEntry is one recorded console action.
type AuditEntry struct {
	ID        int64          `json:"id"`
	Actor     string         `json:"actor"`
	Action    string         `json:"action"`
	Target    string         `json:"target"`
	Detail    map[string]any `json:"detail"`
	CreatedAt time.Time      `json:"createdAt"`
}

// Audit records an action. Failures are returned but callers usually log and
// carry on: an audit write must never block the operation it describes.
func (s *Store) Audit(ctx context.Context, actor, action, target string, detail map[string]any) error {
	if detail == nil {
		detail = map[string]any{}
	}
	_, err := s.Pool.Exec(ctx,
		`INSERT INTO audit_log (actor, action, target, detail) VALUES ($1, $2, $3, $4)`,
		actor, action, target, detail)
	return err
}

// AuditTail returns the most recent entries, newest first.
func (s *Store) AuditTail(ctx context.Context, limit int) ([]AuditEntry, error) {
	if limit <= 0 || limit > 500 {
		limit = 100
	}
	rows, err := s.Pool.Query(ctx,
		`SELECT id, actor, action, target, detail, created_at
		 FROM audit_log ORDER BY created_at DESC, id DESC LIMIT $1`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []AuditEntry{}
	for rows.Next() {
		var e AuditEntry
		if err := rows.Scan(&e.ID, &e.Actor, &e.Action, &e.Target, &e.Detail, &e.CreatedAt); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}
