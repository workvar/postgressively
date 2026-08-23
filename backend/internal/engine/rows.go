package engine

import (
	"context"
	"database/sql"
	"fmt"
	"time"
	"unicode/utf8"

	"github.com/postggresively/backend/internal/model"
)

// collect materializes up to maxRows rows into the shape the web client reads.
func collect(rows *sql.Rows, maxRows int) (*model.QueryResult, error) {
	cols, err := rows.Columns()
	if err != nil {
		return nil, err
	}

	res := &model.QueryResult{Columns: cols, Rows: [][]any{}}
	for rows.Next() {
		if len(res.Rows) >= maxRows {
			res.Truncated = true
			break
		}
		holders := make([]any, len(cols))
		for i := range holders {
			holders[i] = new(any)
		}
		if err := rows.Scan(holders...); err != nil {
			return nil, err
		}
		values := make([]any, len(cols))
		for i, h := range holders {
			values[i] = normalize(*(h.(*any)))
		}
		res.Rows = append(res.Rows, values)
	}
	if err := rows.Err(); err != nil && !res.Truncated {
		return nil, err
	}
	res.RowCount = len(res.Rows)
	return res, nil
}

// normalize converts driver types that do not marshal cleanly to JSON. Text
// arrives as []byte on several drivers, so valid UTF-8 is returned as a
// string and anything else as a hex literal.
func normalize(v any) any {
	switch t := v.(type) {
	case []byte:
		if utf8.Valid(t) {
			return string(t)
		}
		return fmt.Sprintf("\\x%x", t)
	case time.Time:
		return t.Format(time.RFC3339Nano)
	default:
		return v
	}
}

// scanRows runs a query and hands each row to fn.
func (c *Conn) scanRows(ctx context.Context, query string, args []any, fn func(*sql.Rows) error) error {
	rows, err := c.db.QueryContext(ctx, query, args...)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		if err := fn(rows); err != nil {
			return err
		}
	}
	return rows.Err()
}
