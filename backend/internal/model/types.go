// Package model holds the value types every engine speaks in.
//
// They live outside internal/pg so that a MySQL, SQLite or SQL Server
// connection can return the same JSON shapes the web client already reads,
// without the non-Postgres code importing Postgres-specific machinery.
package model

import "time"

// Database is one database on a connection.
type Database struct {
	Name  string `json:"name"`
	Owner string `json:"owner"`
	Size  int64  `json:"sizeBytes"`
	// IsDefault marks the database encoded in the connection string.
	IsDefault bool `json:"isDefault"`
}

// Table is one relation: a table, view or materialized view.
type Table struct {
	Schema string `json:"schema"`
	Name   string `json:"name"`
	Kind   string `json:"kind"`
	Rows   int64  `json:"estimatedRows"`
	Size   int64  `json:"sizeBytes"`
}

// Column is one attribute of a relation.
type Column struct {
	Name     string  `json:"name"`
	Type     string  `json:"type"`
	Nullable bool    `json:"nullable"`
	Default  *string `json:"default"`
	IsPK     bool    `json:"isPrimaryKey"`
}

// Index is one index on a relation, with the engine's own definition text.
type Index struct {
	Name       string `json:"name"`
	Definition string `json:"definition"`
}

// QueryResult is one statement's output, materialized up to MaxRows.
type QueryResult struct {
	Columns   []string `json:"columns"`
	Rows      [][]any  `json:"rows"`
	RowCount  int      `json:"rowCount"`
	Truncated bool     `json:"truncated"`
	Command   string   `json:"command"`
	Duration  float64  `json:"durationMs"`
}

// QueryOptions bounds a single run.
type QueryOptions struct {
	MaxRows  int
	Timeout  time.Duration
	ReadOnly bool
}

// CompletionSource is everything the SQL console needs to offer type-ahead:
// the schemas, relations and columns of one database.
type CompletionSource struct {
	Database  string              `json:"database"`
	Schemas   []string            `json:"schemas"`
	Relations []CompletionTable   `json:"relations"`
	Functions []string            `json:"functions"`
	Columns   map[string][]string `json:"columns"`
}

// CompletionTable is one relation, qualified by schema.
type CompletionTable struct {
	Schema string `json:"schema"`
	Name   string `json:"name"`
	Kind   string `json:"kind"`
}
