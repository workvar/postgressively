// Package conns manages the databases the console connects out to: saving
// them, decrypting their connection strings and pooling one source per
// connection and database.
package conns

import (
	"context"
	"time"

	"github.com/postggresively/backend/internal/engine"
	"github.com/postggresively/backend/internal/model"
)

// Connection is one saved database, as the API returns it. The connection
// string itself never leaves the backend: only Redacted does.
type Connection struct {
	ID        int64      `json:"id"`
	Name      string     `json:"name"`
	Engine    string     `json:"engine"`
	Database  string     `json:"database"`
	Endpoint  string     `json:"endpoint"`
	Redacted  string     `json:"redacted"`
	CreatedBy string     `json:"createdBy"`
	CreatedAt time.Time  `json:"createdAt"`
	UpdatedAt time.Time  `json:"updatedAt"`
	LastUsed  *time.Time `json:"lastUsedAt"`
	// Editable mirrors the engine descriptor, so the UI can hide the row
	// editor without a second lookup.
	Editable bool `json:"editable"`
	Schemas  bool `json:"schemas"`
}

// Source is everything the browsing and query handlers need from a database,
// whatever engine is behind it. Both *pg.Store and *engine.Conn satisfy it.
type Source interface {
	Engine() string
	Editable() bool
	CurrentDatabase() string
	Databases(context.Context) ([]model.Database, error)
	Tables(context.Context) ([]model.Table, error)
	Columns(ctx context.Context, schema, table string) ([]model.Column, error)
	Indexes(ctx context.Context, schema, table string) ([]model.Index, error)
	Completions(context.Context) (*model.CompletionSource, error)
	Run(ctx context.Context, statement string, opts model.QueryOptions) (*model.QueryResult, error)
	Preview(ctx context.Context, schema, table string, limit int, opts model.QueryOptions) (*model.QueryResult, error)
}

// describe fills in the flags the UI reads off an engine descriptor.
func (c *Connection) describe() {
	if d, ok := engine.Describe(engine.Kind(c.Engine)); ok {
		c.Editable = d.Editable
		c.Schemas = d.Schemas
	}
}
