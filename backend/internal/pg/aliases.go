package pg

import "github.com/postggresively/backend/internal/model"

// The console speaks one set of value types across every engine. They live in
// internal/model; these aliases keep the existing pg.* spellings working.
type (
	Database         = model.Database
	Table            = model.Table
	Column           = model.Column
	Index            = model.Index
	QueryResult      = model.QueryResult
	QueryOptions     = model.QueryOptions
	CompletionSource = model.CompletionSource
	CompletionTable  = model.CompletionTable
)
