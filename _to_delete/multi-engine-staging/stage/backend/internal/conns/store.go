package conns

import (
	"context"
	"errors"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
	"github.com/postggresively/backend/internal/engine"
	"github.com/postggresively/backend/internal/pg"
	"github.com/postggresively/backend/internal/secrets"
)

// ErrNotFound is returned for an id that is not in the table.
var ErrNotFound = errors.New("connection not found")

// Store persists saved connections in the console's own database.
type Store struct {
	meta *pg.Store
	box  *secrets.Box
}

// NewStore wires the meta database to the encryption key.
func NewStore(meta *pg.Store, box *secrets.Box) *Store {
	return &Store{meta: meta, box: box}
}

const connectionColumns = `id, name, engine, database, endpoint, redacted,
	created_by, created_at, updated_at, last_used_at`

// List returns every saved connection, oldest first.
func (s *Store) List(ctx context.Context) ([]Connection, error) {
	rows, err := s.meta.Pool.Query(ctx,
		`SELECT `+connectionColumns+` FROM connections ORDER BY name`)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Connection{}
	for rows.Next() {
		c, err := scanConnection(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

// Get returns one saved connection without its secret.
func (s *Store) Get(ctx context.Context, id int64) (Connection, error) {
	row := s.meta.Pool.QueryRow(ctx,
		`SELECT `+connectionColumns+` FROM connections WHERE id = $1`, id)
	c, err := scanConnection(row)
	if errors.Is(err, pgx.ErrNoRows) {
		return Connection{}, ErrNotFound
	}
	return c, err
}

// Spec is a create or update request.
type Spec struct {
	Name   string `json:"name"`
	Engine string `json:"engine"`
	DSN    string `json:"dsn"`
}

// Validate checks the name and connection string without dialing anything.
// It returns the normalized connection string.
func (sp *Spec) Validate() (engine.Kind, string, error) {
	sp.Name = strings.TrimSpace(sp.Name)
	if sp.Name == "" {
		return "", "", errors.New("a name is required")
	}
	if len(sp.Name) > 64 {
		return "", "", errors.New("the name is too long")
	}
	kind, err := engine.ParseKind(sp.Engine)
	if err != nil {
		return "", "", err
	}
	dsn, err := engine.Normalize(kind, sp.DSN)
	if err != nil {
		return "", "", err
	}
	return kind, dsn, nil
}

// Create saves a new connection. The caller is expected to have tested the
// connection string first.
func (s *Store) Create(ctx context.Context, sp Spec, actor string) (Connection, error) {
	kind, dsn, err := sp.Validate()
	if err != nil {
		return Connection{}, err
	}
	sealed, err := s.box.Seal(dsn)
	if err != nil {
		return Connection{}, err
	}

	row := s.meta.Pool.QueryRow(ctx, `
		INSERT INTO connections (name, engine, dsn_encrypted, database, endpoint, redacted, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, $7)
		RETURNING `+connectionColumns,
		sp.Name, string(kind), sealed,
		engine.DatabaseOf(kind, dsn), engine.Endpoint(kind, dsn), engine.Redact(kind, dsn),
		actor)
	c, err := scanConnection(row)
	if err != nil {
		return Connection{}, fmt.Errorf("save connection: %w", err)
	}
	return c, nil
}

// Update replaces the name and, when a new connection string is supplied, the
// stored secret. An empty DSN leaves the existing one alone.
func (s *Store) Update(ctx context.Context, id int64, sp Spec, actor string) (Connection, error) {
	existing, err := s.Get(ctx, id)
	if err != nil {
		return Connection{}, err
	}
	if sp.Engine == "" {
		sp.Engine = existing.Engine
	}
	if strings.TrimSpace(sp.DSN) == "" {
		return s.rename(ctx, id, sp.Name)
	}

	kind, dsn, err := sp.Validate()
	if err != nil {
		return Connection{}, err
	}
	sealed, err := s.box.Seal(dsn)
	if err != nil {
		return Connection{}, err
	}

	row := s.meta.Pool.QueryRow(ctx, `
		UPDATE connections
		   SET name = $2, engine = $3, dsn_encrypted = $4, database = $5,
		       endpoint = $6, redacted = $7, updated_at = now()
		 WHERE id = $1
		RETURNING `+connectionColumns,
		id, sp.Name, string(kind), sealed,
		engine.DatabaseOf(kind, dsn), engine.Endpoint(kind, dsn), engine.Redact(kind, dsn))
	return scanConnection(row)
}

func (s *Store) rename(ctx context.Context, id int64, name string) (Connection, error) {
	name = strings.TrimSpace(name)
	if name == "" {
		return Connection{}, errors.New("a name is required")
	}
	row := s.meta.Pool.QueryRow(ctx, `
		UPDATE connections SET name = $2, updated_at = now() WHERE id = $1
		RETURNING `+connectionColumns, id, name)
	return scanConnection(row)
}

// Delete removes a saved connection.
func (s *Store) Delete(ctx context.Context, id int64) error {
	tag, err := s.meta.Pool.Exec(ctx, `DELETE FROM connections WHERE id = $1`, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNotFound
	}
	return nil
}

// secretFor decrypts one connection string for the registry.
func (s *Store) secretFor(ctx context.Context, id int64) (engine.Kind, string, error) {
	var kindText string
	var sealed []byte
	err := s.meta.Pool.QueryRow(ctx,
		`SELECT engine, dsn_encrypted FROM connections WHERE id = $1`, id).
		Scan(&kindText, &sealed)
	if errors.Is(err, pgx.ErrNoRows) {
		return "", "", ErrNotFound
	}
	if err != nil {
		return "", "", err
	}
	kind, err := engine.ParseKind(kindText)
	if err != nil {
		return "", "", err
	}
	dsn, err := s.box.Open(sealed)
	if err != nil {
		return "", "", err
	}
	return kind, dsn, nil
}

// touch records that a connection was used, so the UI can sort by recency.
func (s *Store) touch(ctx context.Context, id int64) {
	_, _ = s.meta.Pool.Exec(ctx, `UPDATE connections SET last_used_at = now() WHERE id = $1`, id)
}

// scanner covers both pgx.Row and pgx.Rows.
type scanner interface{ Scan(dest ...any) error }

func scanConnection(row scanner) (Connection, error) {
	var c Connection
	err := row.Scan(&c.ID, &c.Name, &c.Engine, &c.Database, &c.Endpoint,
		&c.Redacted, &c.CreatedBy, &c.CreatedAt, &c.UpdatedAt, &c.LastUsed)
	if err != nil {
		return Connection{}, err
	}
	c.describe()
	return c, nil
}
