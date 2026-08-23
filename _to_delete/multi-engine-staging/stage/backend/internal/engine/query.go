package engine

import (
	"context"
	"errors"
	"time"

	"github.com/postggresively/backend/internal/model"
	"github.com/postggresively/backend/internal/sqlguard"
)

// Run executes one statement and materializes up to opts.MaxRows rows.
//
// Statements that return no rows (an INSERT, a DDL) still come back as a
// QueryResult so the console can report what happened uniformly.
func (c *Conn) Run(ctx context.Context, statement string, opts model.QueryOptions) (*model.QueryResult, error) {
	if opts.ReadOnly && !sqlguard.IsReadOnly(statement) {
		return nil, errors.New("this connection is read-only: write statements are rejected")
	}
	ctx, cancel := context.WithTimeout(ctx, opts.Timeout)
	defer cancel()

	start := time.Now()
	rows, err := c.db.QueryContext(ctx, statement)
	if err != nil {
		return c.exec(ctx, statement, start)
	}
	defer rows.Close()

	res, err := collect(rows, opts.MaxRows)
	if err != nil {
		return nil, err
	}
	res.Command = "SELECT"
	res.Duration = millisSince(start)
	return res, nil
}

// exec is the fallback for drivers that refuse to run a non-row statement
// through Query.
func (c *Conn) exec(ctx context.Context, statement string, start time.Time) (*model.QueryResult, error) {
	tag, err := c.db.ExecContext(ctx, statement)
	if err != nil {
		return nil, err
	}
	res := &model.QueryResult{Columns: []string{}, Rows: [][]any{}, Command: "OK"}
	if n, err := tag.RowsAffected(); err == nil {
		res.RowCount = int(n)
	}
	res.Duration = millisSince(start)
	return res, nil
}

// Preview reads the first rows of one relation.
func (c *Conn) Preview(ctx context.Context, schema, table string, limit int, opts model.QueryOptions) (*model.QueryResult, error) {
	return c.Run(ctx, c.dialect.previewSQL(schema, table, limit), opts)
}

func millisSince(t time.Time) float64 {
	return float64(time.Since(t).Microseconds()) / 1000
}
