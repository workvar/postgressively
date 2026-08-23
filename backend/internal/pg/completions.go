package pg

import "context"

const completionRelationsQuery = `
SELECT n.nspname, c.relname,
       CASE c.relkind WHEN 'r' THEN 'table' WHEN 'v' THEN 'view'
                      WHEN 'm' THEN 'matview' WHEN 'p' THEN 'partitioned'
                      ELSE 'relation' END
FROM pg_class c
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r','v','m','p')
  AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
ORDER BY 1, 2`

const completionColumnsQuery = `
SELECT n.nspname || '.' || c.relname, a.attname
FROM pg_attribute a
JOIN pg_class c ON c.oid = a.attrelid
JOIN pg_namespace n ON n.oid = c.relnamespace
WHERE c.relkind IN ('r','v','m','p')
  AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
  AND a.attnum > 0 AND NOT a.attisdropped
ORDER BY 1, a.attnum`

const completionFunctionsQuery = `
SELECT DISTINCT p.proname
FROM pg_proc p
JOIN pg_namespace n ON n.oid = p.pronamespace
WHERE n.nspname IN ('public', 'pg_catalog')
ORDER BY 1
LIMIT 800`

// Completions gathers identifiers for autocomplete in one round of queries.
func (s *Store) Completions(ctx context.Context) (*CompletionSource, error) {
	out := &CompletionSource{
		Database:  s.Pool.Config().ConnConfig.Database,
		Schemas:   []string{},
		Relations: []CompletionTable{},
		Functions: []string{},
		Columns:   map[string][]string{},
	}

	if err := s.collectSchemas(ctx, out); err != nil {
		return nil, err
	}
	if err := s.collectRelations(ctx, out); err != nil {
		return nil, err
	}
	if err := s.collectColumns(ctx, out); err != nil {
		return nil, err
	}
	if err := s.collectFunctions(ctx, out); err != nil {
		return nil, err
	}
	return out, nil
}

func (s *Store) collectSchemas(ctx context.Context, out *CompletionSource) error {
	rows, err := s.Pool.Query(ctx, `
		SELECT nspname FROM pg_namespace
		WHERE nspname NOT IN ('pg_toast') AND nspname NOT LIKE 'pg_temp%'
		ORDER BY 1`)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return err
		}
		out.Schemas = append(out.Schemas, name)
	}
	return rows.Err()
}

func (s *Store) collectRelations(ctx context.Context, out *CompletionSource) error {
	rows, err := s.Pool.Query(ctx, completionRelationsQuery)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var t CompletionTable
		if err := rows.Scan(&t.Schema, &t.Name, &t.Kind); err != nil {
			return err
		}
		out.Relations = append(out.Relations, t)
	}
	return rows.Err()
}

func (s *Store) collectColumns(ctx context.Context, out *CompletionSource) error {
	rows, err := s.Pool.Query(ctx, completionColumnsQuery)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var qualified, column string
		if err := rows.Scan(&qualified, &column); err != nil {
			return err
		}
		out.Columns[qualified] = append(out.Columns[qualified], column)
	}
	return rows.Err()
}

func (s *Store) collectFunctions(ctx context.Context, out *CompletionSource) error {
	rows, err := s.Pool.Query(ctx, completionFunctionsQuery)
	if err != nil {
		return err
	}
	defer rows.Close()
	for rows.Next() {
		var name string
		if err := rows.Scan(&name); err != nil {
			return err
		}
		out.Functions = append(out.Functions, name)
	}
	return rows.Err()
}
