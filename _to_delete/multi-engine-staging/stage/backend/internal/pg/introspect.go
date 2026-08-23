package pg

import "context"

func (s *Store) Databases(ctx context.Context) ([]Database, error) {
	const q = `SELECT d.datname, pg_get_userbyid(d.datdba), pg_database_size(d.datname)
	           FROM pg_database d WHERE NOT d.datistemplate ORDER BY 1`
	rows, err := s.Pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Database{}
	for rows.Next() {
		var d Database
		if err := rows.Scan(&d.Name, &d.Owner, &d.Size); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

func (s *Store) Tables(ctx context.Context) ([]Table, error) {
	const q = `SELECT n.nspname, c.relname,
	                  CASE c.relkind WHEN 'r' THEN 'table' WHEN 'v' THEN 'view'
	                                 WHEN 'm' THEN 'matview' WHEN 'p' THEN 'partitioned' END,
	                  GREATEST(c.reltuples, 0)::bigint,
	                  pg_total_relation_size(c.oid)
	           FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
	           WHERE c.relkind IN ('r','v','m','p')
	             AND n.nspname NOT IN ('pg_catalog','information_schema')
	           ORDER BY 1, 2`
	rows, err := s.Pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Table{}
	for rows.Next() {
		var t Table
		if err := rows.Scan(&t.Schema, &t.Name, &t.Kind, &t.Rows, &t.Size); err != nil {
			return nil, err
		}
		out = append(out, t)
	}
	return out, rows.Err()
}

func (s *Store) Columns(ctx context.Context, schema, table string) ([]Column, error) {
	const q = `SELECT a.attname,
	                  format_type(a.atttypid, a.atttypmod),
	                  NOT a.attnotnull,
	                  pg_get_expr(ad.adbin, ad.adrelid),
	                  COALESCE(i.indisprimary, false)
	           FROM pg_attribute a
	           JOIN pg_class c ON c.oid = a.attrelid
	           JOIN pg_namespace n ON n.oid = c.relnamespace
	           LEFT JOIN pg_attrdef ad ON ad.adrelid = c.oid AND ad.adnum = a.attnum
	           LEFT JOIN pg_index i ON i.indrelid = c.oid AND a.attnum = ANY(i.indkey) AND i.indisprimary
	           WHERE n.nspname = $1 AND c.relname = $2 AND a.attnum > 0 AND NOT a.attisdropped
	           ORDER BY a.attnum`
	rows, err := s.Pool.Query(ctx, q, schema, table)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Column{}
	for rows.Next() {
		var c Column
		if err := rows.Scan(&c.Name, &c.Type, &c.Nullable, &c.Default, &c.IsPK); err != nil {
			return nil, err
		}
		out = append(out, c)
	}
	return out, rows.Err()
}

func (s *Store) Indexes(ctx context.Context, schema, table string) ([]Index, error) {
	const q = `SELECT indexname, indexdef FROM pg_indexes WHERE schemaname = $1 AND tablename = $2 ORDER BY 1`
	rows, err := s.Pool.Query(ctx, q, schema, table)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Index{}
	for rows.Next() {
		var i Index
		if err := rows.Scan(&i.Name, &i.Definition); err != nil {
			return nil, err
		}
		out = append(out, i)
	}
	return out, rows.Err()
}
