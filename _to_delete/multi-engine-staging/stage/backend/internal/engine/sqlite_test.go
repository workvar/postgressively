package engine

import (
	"context"
	"database/sql"
	"path/filepath"
	"testing"
	"time"

	"github.com/postggresively/backend/internal/model"
)

// SQLite needs no server, so it is the one engine the whole read path can be
// exercised against for real.
func openFixture(t *testing.T) *Conn {
	t.Helper()
	path := filepath.Join(t.TempDir(), "fixture.db")

	seed, err := sql.Open("sqlite", path)
	if err != nil {
		t.Fatalf("open fixture: %v", err)
	}
	defer seed.Close()

	for _, stmt := range []string{
		`CREATE TABLE authors (id INTEGER PRIMARY KEY, name TEXT NOT NULL, bio TEXT)`,
		`CREATE INDEX authors_name_idx ON authors (name)`,
		`CREATE VIEW author_names AS SELECT name FROM authors`,
		`INSERT INTO authors (name, bio) VALUES ('Ursula', 'writes'), ('Italo', NULL)`,
	} {
		if _, err := seed.Exec(stmt); err != nil {
			t.Fatalf("seed %q: %v", stmt, err)
		}
	}

	conn, err := Open(context.Background(), SQLite, path)
	if err != nil {
		t.Fatalf("engine open: %v", err)
	}
	t.Cleanup(conn.Close)
	return conn
}

func TestSQLiteIntrospection(t *testing.T) {
	conn := openFixture(t)
	ctx := context.Background()

	tables, err := conn.Tables(ctx)
	if err != nil {
		t.Fatalf("tables: %v", err)
	}
	kinds := map[string]string{}
	for _, tb := range tables {
		if tb.Schema != SQLiteSchema {
			t.Errorf("expected schema %q, got %q", SQLiteSchema, tb.Schema)
		}
		kinds[tb.Name] = tb.Kind
	}
	if kinds["authors"] != "table" || kinds["author_names"] != "view" {
		t.Fatalf("unexpected relations: %v", kinds)
	}

	cols, err := conn.Columns(ctx, SQLiteSchema, "authors")
	if err != nil {
		t.Fatalf("columns: %v", err)
	}
	if len(cols) != 3 {
		t.Fatalf("got %d columns, want 3", len(cols))
	}
	if !cols[0].IsPK {
		t.Error("id should be the primary key")
	}
	if cols[1].Nullable {
		t.Error("name is NOT NULL, so it should not be nullable")
	}
	if !cols[2].Nullable {
		t.Error("bio should be nullable")
	}

	idx, err := conn.Indexes(ctx, SQLiteSchema, "authors")
	if err != nil {
		t.Fatalf("indexes: %v", err)
	}
	if len(idx) == 0 || idx[0].Name != "authors_name_idx" {
		t.Fatalf("unexpected indexes: %v", idx)
	}
}

func TestSQLitePreviewAndCompletions(t *testing.T) {
	conn := openFixture(t)
	ctx := context.Background()
	opts := model.QueryOptions{MaxRows: 10, Timeout: 5 * time.Second, ReadOnly: true}

	res, err := conn.Preview(ctx, SQLiteSchema, "authors", 10, opts)
	if err != nil {
		t.Fatalf("preview: %v", err)
	}
	if res.RowCount != 2 {
		t.Fatalf("got %d rows, want 2", res.RowCount)
	}

	src, err := conn.Completions(ctx)
	if err != nil {
		t.Fatalf("completions: %v", err)
	}
	if got := src.Columns["main.authors"]; len(got) != 3 {
		t.Fatalf("got columns %v, want 3", got)
	}
}

func TestReadOnlyRejectsWrites(t *testing.T) {
	conn := openFixture(t)
	opts := model.QueryOptions{MaxRows: 10, Timeout: 5 * time.Second, ReadOnly: true}

	if _, err := conn.Run(context.Background(), "DELETE FROM authors", opts); err == nil {
		t.Fatal("expected a write to be rejected on a read-only run")
	}
}
