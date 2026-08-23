package pg

import (
	"context"
	"fmt"
	"time"
)

// Run executes a single statement and materializes up to MaxRows rows.
func (s *Store) Run(ctx context.Context, sql string, opts QueryOptions) (*QueryResult, error) {
	if opts.ReadOnly && !IsReadOnly(sql) {
		return nil, fmt.Errorf("server is in read-only mode: write statements are rejected")
	}
	ctx, cancel := context.WithTimeout(ctx, opts.Timeout)
	defer cancel()

	conn, err := s.Pool.Acquire(ctx)
	if err != nil {
		return nil, err
	}
	defer conn.Release()

	if _, err := conn.Exec(ctx, fmt.Sprintf("SET statement_timeout = %d", opts.Timeout.Milliseconds())); err != nil {
		return nil, err
	}

	start := time.Now()
	rows, err := conn.Query(ctx, sql)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	res := &QueryResult{Rows: [][]any{}}
	for _, fd := range rows.FieldDescriptions() {
		res.Columns = append(res.Columns, fd.Name)
	}
	for rows.Next() {
		if len(res.Rows) >= opts.MaxRows {
			res.Truncated = true
			break
		}
		vals, err := rows.Values()
		if err != nil {
			return nil, err
		}
		res.Rows = append(res.Rows, normalize(vals))
	}
	if err := rows.Err(); err != nil && !res.Truncated {
		return nil, err
	}
	res.Command = rows.CommandTag().String()
	res.RowCount = len(res.Rows)
	res.Duration = float64(time.Since(start).Microseconds()) / 1000
	return res, nil
}

// normalize converts driver types that do not marshal cleanly to JSON.
func normalize(vals []any) []any {
	out := make([]any, len(vals))
	for i, v := range vals {
		switch t := v.(type) {
		case []byte:
			out[i] = fmt.Sprintf("\\x%x", t)
		case time.Time:
			out[i] = t.Format(time.RFC3339Nano)
		default:
			out[i] = v
		}
	}
	return out
}
