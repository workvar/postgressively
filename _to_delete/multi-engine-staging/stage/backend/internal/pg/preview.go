package pg

import (
	"context"
	"fmt"
)

// Engine names the dialect this store speaks. It exists so a Store and an
// engine.Conn can be reached through the same handler-side interface.
func (s *Store) Engine() string { return "postgres" }

// Editable reports whether the grid may write rows through this store.
// Postgres is the only engine with a row editor today.
func (s *Store) Editable() bool { return true }

// CurrentDatabase is the database this store is connected to.
func (s *Store) CurrentDatabase() string {
	return s.Pool.Config().ConnConfig.Database
}

// Preview reads the first rows of one relation.
func (s *Store) Preview(ctx context.Context, schema, table string, limit int, opts QueryOptions) (*QueryResult, error) {
	if schema == "" {
		schema = "public"
	}
	sql := fmt.Sprintf("SELECT * FROM %s.%s LIMIT %d", quoteIdent(schema), quoteIdent(table), limit)
	return s.Run(ctx, sql, opts)
}
