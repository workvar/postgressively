package conns

import (
	"context"
	"fmt"
	"sync"

	"github.com/postggresively/backend/internal/engine"
	"github.com/postggresively/backend/internal/pg"
)

// Registry opens and caches one Source per saved connection and database, the
// same way pg.Manager does for the local server.
//
// A Postgres connection is served by internal/pg, which has the richer feature
// set (row editing, database details, activity). Every other engine goes
// through internal/engine.
type Registry struct {
	store *Store

	mu   sync.Mutex
	open map[string]entry
}

type entry struct {
	source Source
	close  func()
}

func NewRegistry(store *Store) *Registry {
	return &Registry{store: store, open: map[string]entry{}}
}

// Source returns a pooled connection to one database on a saved connection.
// An empty database name uses the one in the connection string.
func (r *Registry) Source(ctx context.Context, id int64, database string) (Source, error) {
	key := fmt.Sprintf("%d|%s", id, database)

	r.mu.Lock()
	if e, ok := r.open[key]; ok {
		r.mu.Unlock()
		go r.store.touch(context.WithoutCancel(ctx), id)
		return e.source, nil
	}
	r.mu.Unlock()

	e, err := r.dial(ctx, id, database)
	if err != nil {
		return nil, err
	}

	r.mu.Lock()
	defer r.mu.Unlock()
	if existing, ok := r.open[key]; ok { // lost a race; keep the winner
		e.close()
		return existing.source, nil
	}
	r.open[key] = e
	go r.store.touch(context.WithoutCancel(ctx), id)
	return e.source, nil
}

func (r *Registry) dial(ctx context.Context, id int64, database string) (entry, error) {
	kind, dsn, err := r.store.secretFor(ctx, id)
	if err != nil {
		return entry{}, err
	}
	dsn, err = engine.WithDatabase(kind, dsn, database)
	if err != nil {
		return entry{}, err
	}

	if kind == engine.Postgres {
		store, err := pg.New(ctx, dsn)
		if err != nil {
			return entry{}, err
		}
		return entry{source: store, close: store.Close}, nil
	}

	conn, err := engine.Open(ctx, kind, dsn)
	if err != nil {
		return entry{}, err
	}
	return entry{source: conn, close: conn.Close}, nil
}

// Forget drops every pooled connection for one saved connection, which is what
// an edit or a delete needs.
func (r *Registry) Forget(id int64) {
	prefix := fmt.Sprintf("%d|", id)
	r.mu.Lock()
	defer r.mu.Unlock()
	for key, e := range r.open {
		if len(key) >= len(prefix) && key[:len(prefix)] == prefix {
			e.close()
			delete(r.open, key)
		}
	}
}

// Close releases every pooled connection.
func (r *Registry) Close() {
	r.mu.Lock()
	defer r.mu.Unlock()
	for key, e := range r.open {
		e.close()
		delete(r.open, key)
	}
}
