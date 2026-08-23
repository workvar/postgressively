package pg

import (
	"context"
	"fmt"

	"github.com/jackc/pgx/v5"
	"github.com/jackc/pgx/v5/pgxpool"
)

// OpenMeta connects to the console's own database, creating it on first boot.
//
// baseURL is the operator's connection string; only the database name is
// swapped. CREATE DATABASE cannot run inside a transaction or over a pool that
// might reuse the connection, so it goes through a single short-lived conn.
func OpenMeta(ctx context.Context, baseURL, name string) (*Store, error) {
	if err := ValidIdent(name); err != nil {
		return nil, fmt.Errorf("PG_META_DATABASE: %w", err)
	}
	if err := ensureDatabase(ctx, baseURL, name); err != nil {
		return nil, err
	}

	cfg, err := pgxpool.ParseConfig(baseURL)
	if err != nil {
		return nil, err
	}
	cfg.ConnConfig.Database = name
	cfg.MaxConns = 4

	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}

	store := &Store{Pool: pool}
	if err := store.EnsureMetaSchema(ctx); err != nil {
		store.Close()
		return nil, err
	}
	return store, nil
}

// ensureDatabase creates the named database when it does not exist yet.
func ensureDatabase(ctx context.Context, baseURL, name string) error {
	cfg, err := pgx.ParseConfig(baseURL)
	if err != nil {
		return err
	}
	conn, err := pgx.ConnectConfig(ctx, cfg)
	if err != nil {
		return err
	}
	defer conn.Close(ctx)

	var exists bool
	err = conn.QueryRow(ctx, `SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1)`, name).Scan(&exists)
	if err != nil {
		return err
	}
	if exists {
		return nil
	}

	_, err = conn.Exec(ctx, "CREATE DATABASE "+quoteIdent(name))
	if err != nil && !isDuplicateDatabase(err) {
		return fmt.Errorf("create database %q: %w", name, err)
	}
	return nil
}

// EnsureMetaSchema applies the console's own tables. It is idempotent.
func (s *Store) EnsureMetaSchema(ctx context.Context) error {
	_, err := s.Pool.Exec(ctx, metaSchemaDDL)
	return err
}
