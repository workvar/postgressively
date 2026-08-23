package pg

import (
	"context"
	"sync"

	"github.com/jackc/pgx/v5/pgxpool"
)

// Manager lazily opens and caches one Store per database on the same server,
// so handlers can serve requests scoped to any database via ?db=<name>.
type Manager struct {
	baseURL  string
	def      string
	metaName string
	meta     *Store

	mu     sync.Mutex
	stores map[string]*Store
}

// NewManager opens the operator's default database plus the console's own
// metadata database, creating the latter on first boot.
func NewManager(ctx context.Context, baseURL, metaName string) (*Manager, error) {
	cfg, err := pgxpool.ParseConfig(baseURL)
	if err != nil {
		return nil, err
	}
	root, err := New(ctx, baseURL)
	if err != nil {
		return nil, err
	}
	meta, err := OpenMeta(ctx, baseURL, metaName)
	if err != nil {
		root.Close()
		return nil, err
	}
	def := cfg.ConnConfig.Database
	return &Manager{
		baseURL:  baseURL,
		def:      def,
		metaName: metaName,
		meta:     meta,
		stores:   map[string]*Store{def: root},
	}, nil
}

// Meta is the console's own database: accounts, passkeys, settings, audit log.
func (m *Manager) Meta() *Store { return m.meta }

// MetaName is the database the console keeps its own state in.
func (m *Manager) MetaName() string { return m.metaName }

// DefaultName is the database encoded in the configured connection URL.
func (m *Manager) DefaultName() string { return m.def }

// Default returns the store for the configured database.
func (m *Manager) Default() *Store {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.stores[m.def]
}

// Store returns a pooled connection to db, opening one on first use.
// An empty name resolves to the default database.
func (m *Manager) Store(ctx context.Context, db string) (*Store, error) {
	if db == "" {
		db = m.def
	}

	m.mu.Lock()
	if s, ok := m.stores[db]; ok {
		m.mu.Unlock()
		return s, nil
	}
	m.mu.Unlock()

	s, err := m.open(ctx, db)
	if err != nil {
		return nil, err
	}

	m.mu.Lock()
	defer m.mu.Unlock()
	if existing, ok := m.stores[db]; ok { // lost a race; keep the winner
		s.Close()
		return existing, nil
	}
	m.stores[db] = s
	return s, nil
}

func (m *Manager) open(ctx context.Context, db string) (*Store, error) {
	cfg, err := pgxpool.ParseConfig(m.baseURL)
	if err != nil {
		return nil, err
	}
	cfg.ConnConfig.Database = db
	cfg.MaxConns = 4
	pool, err := pgxpool.NewWithConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	if err := pool.Ping(ctx); err != nil {
		pool.Close()
		return nil, err
	}
	return &Store{Pool: pool}, nil
}

func (m *Manager) Close() {
	m.mu.Lock()
	defer m.mu.Unlock()
	if m.meta != nil {
		m.meta.Close()
		m.meta = nil
	}
	for name, s := range m.stores {
		s.Close()
		delete(m.stores, name)
	}
}
