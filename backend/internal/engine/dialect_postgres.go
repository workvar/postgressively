package engine

import (
	"fmt"
	"strings"
)

// postgresDialect exists so a saved Postgres connection can be tested and
// browsed through the same path as every other engine. The local instance
// still goes through internal/pg, which has the richer feature set.
type postgresDialect struct{}

func (postgresDialect) kind() Kind { return Postgres }

func (postgresDialect) quote(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

func (d postgresDialect) qualify(schema, table string) string {
	if schema == "" {
		schema = "public"
	}
	return d.quote(schema) + "." + d.quote(table)
}

func (d postgresDialect) previewSQL(schema, table string, limit int) string {
	return fmt.Sprintf("SELECT * FROM %s LIMIT %d", d.qualify(schema, table), limit)
}

func (postgresDialect) placeholder(n int) string { return fmt.Sprintf("$%d", n) }

func (postgresDialect) databasesSQL() string {
	return `SELECT d.datname, pg_get_userbyid(d.datdba), pg_database_size(d.datname)
	        FROM pg_database d WHERE NOT d.datistemplate ORDER BY 1`
}

func (postgresDialect) tablesSQL() string {
	return `SELECT n.nspname, c.relname,
	               CASE c.relkind WHEN 'r' THEN 'table' WHEN 'v' THEN 'view'
	                              WHEN 'm' THEN 'matview' ELSE 'partitioned' END,
	               GREATEST(c.reltuples, 0)::bigint,
	               pg_total_relation_size(c.oid)
	        FROM pg_class c JOIN pg_namespace n ON n.oid = c.relnamespace
	        WHERE c.relkind IN ('r','v','m','p')
	          AND n.nspname NOT IN ('pg_catalog','information_schema')
	        ORDER BY 1, 2`
}

func (postgresDialect) columnsSQL() string {
	return `SELECT a.attname, format_type(a.atttypid, a.atttypmod), NOT a.attnotnull,
	               pg_get_expr(ad.adbin, ad.adrelid), COALESCE(i.indisprimary, false)
	        FROM pg_attribute a
	        JOIN pg_class c ON c.oid = a.attrelid
	        JOIN pg_namespace n ON n.oid = c.relnamespace
	        LEFT JOIN pg_attrdef ad ON ad.adrelid = c.oid AND ad.adnum = a.attnum
	        LEFT JOIN pg_index i ON i.indrelid = c.oid AND a.attnum = ANY(i.indkey) AND i.indisprimary
	        WHERE n.nspname = $1 AND c.relname = $2 AND a.attnum > 0 AND NOT a.attisdropped
	        ORDER BY a.attnum`
}

func (postgresDialect) indexesSQL() string {
	return `SELECT indexname, indexdef FROM pg_indexes
	        WHERE schemaname = $1 AND tablename = $2 ORDER BY 1`
}

func (postgresDialect) schemasSQL() string {
	return `SELECT nspname FROM pg_namespace
	        WHERE nspname NOT IN ('pg_toast') AND nspname NOT LIKE 'pg_temp%' ORDER BY 1`
}

func (postgresDialect) columnsAllSQL() string {
	return `SELECT n.nspname || '.' || c.relname, a.attname
	        FROM pg_attribute a
	        JOIN pg_class c ON c.oid = a.attrelid
	        JOIN pg_namespace n ON n.oid = c.relnamespace
	        WHERE c.relkind IN ('r','v','m','p')
	          AND n.nspname NOT IN ('pg_catalog','information_schema','pg_toast')
	          AND a.attnum > 0 AND NOT a.attisdropped
	        ORDER BY 1, a.attnum`
}

func (postgresDialect) functionsSQL() string {
	return `SELECT DISTINCT p.proname FROM pg_proc p
	        JOIN pg_namespace n ON n.oid = p.pronamespace
	        WHERE n.nspname IN ('public','pg_catalog') ORDER BY 1 LIMIT 800`
}

func (postgresDialect) versionSQL() string { return `SELECT version()` }

func (postgresDialect) introspectArgs(schema, table string) []any {
	if schema == "" {
		schema = "public"
	}
	return []any{schema, table}
}
