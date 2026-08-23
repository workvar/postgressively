package pg

import "github.com/postggresively/backend/internal/sqlguard"

// The statement guard is shared with the other engines, so it lives in
// internal/sqlguard. These keep the pg.* spellings the handlers already use.
var (
	// IsReadOnly reports whether every statement in sql is a read.
	IsReadOnly = sqlguard.IsReadOnly
	// SplitStatements splits on semicolons outside of quotes.
	SplitStatements = sqlguard.SplitStatements
)
