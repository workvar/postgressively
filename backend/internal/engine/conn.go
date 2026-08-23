package engine

import (
	"context"
	"database/sql"
	"fmt"
	"time"

	_ "github.com/go-sql-driver/mysql"
	_ "github.com/jackc/pgx/v5/stdlib"
	_ "github.com/microsoft/go-mssqldb"
	_ "modernc.org/sqlite"
)

// driverName maps an engine onto the database/sql driver registered for it.
func driverName(k Kind) (string, error) {
	switch k {
	case Postgres:
		return "pgx", nil
	case MySQL:
		return "mysql", nil
	case SQLite:
		return "sqlite", nil
	case SQLServer:
		return "sqlserver", nil
	}
	return "", fmt.Errorf("unsupported engine %q", k)
}

// Conn is one pooled connection to a saved database, on any engine.
type Conn struct {
	db       *sql.DB
	kind     Kind
	dialect  dialect
	dsn      string
	database string
}

// Open dials dsn and verifies the connection before returning. The caller owns
// the result and must Close it.
func Open(ctx context.Context, k Kind, dsn string) (*Conn, error) {
	normalized, err := Normalize(k, dsn)
	if err != nil {
		return nil, err
	}
	d, err := dialectFor(k)
	if err != nil {
		return nil, err
	}
	name, err := driverName(k)
	if err != nil {
		return nil, err
	}

	db, err := sql.Open(name, normalized)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(4)
	db.SetMaxIdleConns(2)
	db.SetConnMaxIdleTime(5 * time.Minute)

	if err := db.PingContext(ctx); err != nil {
		db.Close()
		return nil, err
	}
	return &Conn{
		db:       db,
		kind:     k,
		dialect:  d,
		dsn:      normalized,
		database: DatabaseOf(k, normalized),
	}, nil
}

// Engine names the dialect, matching the interface pg.Store satisfies.
func (c *Conn) Engine() string { return string(c.kind) }

// Editable reports whether the row grid may write through this connection.
// Only Postgres has a row editor today.
func (c *Conn) Editable() bool { return false }

// CurrentDatabase is the database encoded in the connection string.
func (c *Conn) CurrentDatabase() string { return c.database }

// Version is the engine's own version banner, used by the connection test.
func (c *Conn) Version(ctx context.Context) (string, error) {
	var v string
	err := c.db.QueryRowContext(ctx, c.dialect.versionSQL()).Scan(&v)
	return v, err
}

func (c *Conn) Close() {
	if c.db != nil {
		c.db.Close()
	}
}
