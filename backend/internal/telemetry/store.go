package telemetry

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"strings"
	"time"

	_ "modernc.org/sqlite"
)

// store is the local, Postgres-independent home for everything telemetry
// needs to remember: the installation's anonymous identity, the operator's
// on/off preferences, and events waiting to be sent. It has to keep working
// even when the operator's Postgres is unreachable -- and even when
// telemetry itself is disabled, so a re-enable doesn't start from scratch.
//
// modernc.org/sqlite is a pure-Go driver (already a backend dependency, via
// the SQLite engine under internal/engine): no cgo, so it doesn't disturb
// the CGO_ENABLED=0 cross-compiles the release pipeline depends on.
type store struct {
	db *sql.DB
}

const schema = `
CREATE TABLE IF NOT EXISTS kv (
	key   TEXT PRIMARY KEY,
	value TEXT NOT NULL
);
CREATE TABLE IF NOT EXISTS events (
	id         INTEGER PRIMARY KEY AUTOINCREMENT,
	payload    TEXT NOT NULL,
	created_at INTEGER NOT NULL
);
`

func openStore(dataDir string) (*store, error) {
	if err := os.MkdirAll(dataDir, 0o750); err != nil {
		return nil, fmt.Errorf("create data dir: %w", err)
	}
	path := filepath.Join(dataDir, "telemetry.db")
	db, err := sql.Open("sqlite", path)
	if err != nil {
		return nil, fmt.Errorf("open %s: %w", path, err)
	}
	// The queue is tiny and single-process; one connection keeps modernc's
	// SQLite (no WAL by default) from ever seeing concurrent writers.
	db.SetMaxOpenConns(1)
	if _, err := db.Exec(schema); err != nil {
		db.Close()
		return nil, fmt.Errorf("migrate: %w", err)
	}
	return &store{db: db}, nil
}

func (s *store) close() error { return s.db.Close() }

func (s *store) getKV(key string) (string, bool, error) {
	var v string
	err := s.db.QueryRow(`SELECT value FROM kv WHERE key = ?`, key).Scan(&v)
	if err == sql.ErrNoRows {
		return "", false, nil
	}
	if err != nil {
		return "", false, err
	}
	return v, true, nil
}

func (s *store) setKV(key, value string) error {
	_, err := s.db.Exec(
		`INSERT INTO kv (key, value) VALUES (?, ?)
		 ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
		key, value)
	return err
}

func (s *store) getJSON(key string, v any) (bool, error) {
	raw, ok, err := s.getKV(key)
	if err != nil || !ok {
		return ok, err
	}
	return true, json.Unmarshal([]byte(raw), v)
}

func (s *store) setJSON(key string, v any) error {
	raw, err := json.Marshal(v)
	if err != nil {
		return err
	}
	return s.setKV(key, string(raw))
}

// queuedEvent is one row waiting to be sent.
type queuedEvent struct {
	id      int64
	payload []byte
}

func (s *store) enqueue(payload []byte) error {
	_, err := s.db.Exec(`INSERT INTO events (payload, created_at) VALUES (?, ?)`, string(payload), time.Now().Unix())
	return err
}

// pending returns the oldest queued events, up to limit, so delivery stays
// in the order events were recorded.
func (s *store) pending(limit int) ([]queuedEvent, error) {
	rows, err := s.db.Query(`SELECT id, payload FROM events ORDER BY id ASC LIMIT ?`, limit)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	var out []queuedEvent
	for rows.Next() {
		var e queuedEvent
		var payload string
		if err := rows.Scan(&e.id, &payload); err != nil {
			return nil, err
		}
		e.payload = []byte(payload)
		out = append(out, e)
	}
	return out, rows.Err()
}

// delete removes rows once they've been sent (or given up on as unreadable).
func (s *store) delete(ids []int64) error {
	if len(ids) == 0 {
		return nil
	}
	placeholders := strings.TrimSuffix(strings.Repeat("?,", len(ids)), ",")
	args := make([]any, len(ids))
	for i, id := range ids {
		args[i] = id
	}
	_, err := s.db.Exec(`DELETE FROM events WHERE id IN (`+placeholders+`)`, args...)
	return err
}
