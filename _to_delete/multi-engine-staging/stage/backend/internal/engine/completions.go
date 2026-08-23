package engine

import (
	"context"
	"database/sql"
	"strings"

	"github.com/postggresively/backend/internal/model"
)

// Completions gathers the identifiers the SQL console offers as type-ahead.
// An engine with no routine catalog simply returns no functions.
func (c *Conn) Completions(ctx context.Context) (*model.CompletionSource, error) {
	out := &model.CompletionSource{
		Database:  c.database,
		Schemas:   []string{},
		Relations: []model.CompletionTable{},
		Functions: []string{},
		Columns:   map[string][]string{},
	}

	if err := c.collectNames(ctx, c.dialect.schemasSQL(), &out.Schemas); err != nil {
		return nil, err
	}

	tables, err := c.Tables(ctx)
	if err != nil {
		return nil, err
	}
	for _, t := range tables {
		out.Relations = append(out.Relations, model.CompletionTable{
			Schema: t.Schema, Name: t.Name, Kind: t.Kind,
		})
	}

	if err := c.collectColumns(ctx, out); err != nil {
		return nil, err
	}
	if q := c.dialect.functionsSQL(); q != "" {
		if err := c.collectNames(ctx, q, &out.Functions); err != nil {
			return nil, err
		}
	}
	return out, nil
}

func (c *Conn) collectNames(ctx context.Context, query string, into *[]string) error {
	return c.scanRows(ctx, query, nil, func(rows *sql.Rows) error {
		var name any
		if err := rows.Scan(&name); err != nil {
			return err
		}
		if s := toString(name); s != "" {
			*into = append(*into, s)
		}
		return nil
	})
}

func (c *Conn) collectColumns(ctx context.Context, out *model.CompletionSource) error {
	return c.scanRows(ctx, c.dialect.columnsAllSQL(), nil, func(rows *sql.Rows) error {
		var qualified, column any
		if err := rows.Scan(&qualified, &column); err != nil {
			return err
		}
		key := strings.TrimSpace(toString(qualified))
		out.Columns[key] = append(out.Columns[key], toString(column))
		return nil
	})
}
