package engine

import (
	"context"
	"database/sql"

	"github.com/postggresively/backend/internal/model"
)

// Databases lists every database reachable on this connection. SQLite reports
// the single attached file.
func (c *Conn) Databases(ctx context.Context) ([]model.Database, error) {
	out := []model.Database{}
	err := c.scanRows(ctx, c.dialect.databasesSQL(), nil, func(rows *sql.Rows) error {
		var name, owner, size any
		if err := rows.Scan(&name, &owner, &size); err != nil {
			return err
		}
		out = append(out, model.Database{
			Name:      toString(name),
			Owner:     toString(owner),
			Size:      toInt64(size),
			IsDefault: toString(name) == c.database,
		})
		return nil
	})
	return out, err
}

// Tables lists the relations in the connected database.
func (c *Conn) Tables(ctx context.Context) ([]model.Table, error) {
	out := []model.Table{}
	err := c.scanRows(ctx, c.dialect.tablesSQL(), nil, func(rows *sql.Rows) error {
		var schema, name, kind, estimated, size any
		if err := rows.Scan(&schema, &name, &kind, &estimated, &size); err != nil {
			return err
		}
		out = append(out, model.Table{
			Schema: toString(schema),
			Name:   toString(name),
			Kind:   toString(kind),
			Rows:   toInt64(estimated),
			Size:   toInt64(size),
		})
		return nil
	})
	return out, err
}

// Columns describes one relation.
func (c *Conn) Columns(ctx context.Context, schema, table string) ([]model.Column, error) {
	out := []model.Column{}
	args := c.dialect.introspectArgs(schema, table)
	err := c.scanRows(ctx, c.dialect.columnsSQL(), args, func(rows *sql.Rows) error {
		var name, typ, nullable, def, pk any
		if err := rows.Scan(&name, &typ, &nullable, &def, &pk); err != nil {
			return err
		}
		out = append(out, model.Column{
			Name:     toString(name),
			Type:     toString(typ),
			Nullable: toBool(nullable),
			Default:  toStringPtr(def),
			IsPK:     toBool(pk),
		})
		return nil
	})
	return out, err
}

// Indexes lists the indexes on one relation, with whatever definition text the
// engine can give.
func (c *Conn) Indexes(ctx context.Context, schema, table string) ([]model.Index, error) {
	out := []model.Index{}
	args := c.dialect.introspectArgs(schema, table)
	err := c.scanRows(ctx, c.dialect.indexesSQL(), args, func(rows *sql.Rows) error {
		var name, def any
		if err := rows.Scan(&name, &def); err != nil {
			return err
		}
		out = append(out, model.Index{Name: toString(name), Definition: toString(def)})
		return nil
	})
	return out, err
}
