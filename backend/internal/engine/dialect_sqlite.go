package engine

import (
	"fmt"
	"strings"
)

// sqliteDialect reads one file. There is no schema layer, so every relation is
// reported under the pseudo-schema "main", which is also what SQLite calls the
// primary attached database.
type sqliteDialect struct{}

// SQLiteSchema is the single schema name SQLite relations are reported under.
const SQLiteSchema = "main"

func (sqliteDialect) kind() Kind { return SQLite }

func (sqliteDialect) quote(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

func (d sqliteDialect) qualify(_, table string) string { return d.quote(table) }

func (d sqliteDialect) previewSQL(_, table string, limit int) string {
	return fmt.Sprintf("SELECT * FROM %s LIMIT %d", d.quote(table), limit)
}

func (sqliteDialect) placeholder(int) string { return "?" }

func (sqliteDialect) databasesSQL() string {
	return `SELECT 'main', '', COALESCE((SELECT page_count * page_size FROM pragma_page_count(), pragma_page_size()), 0)`
}

func (sqliteDialect) tablesSQL() string {
	return `SELECT 'main', name,
	               CASE type WHEN 'view' THEN 'view' ELSE 'table' END,
	               0, 0
	        FROM sqlite_master
	        WHERE type IN ('table','view') AND name NOT LIKE 'sqlite_%'
	        ORDER BY 2`
}

func (sqliteDialect) introspectArgs(_, table string) []any { return []any{table} }

func (sqliteDialect) columnsSQL() string {
	return `SELECT name, type, "notnull" = 0, dflt_value, pk > 0
	        FROM pragma_table_info(?)
	        ORDER BY cid`
}

func (sqliteDialect) indexesSQL() string {
	return `SELECT name, COALESCE(sql, 'implicit index')
	        FROM sqlite_master
	        WHERE type = 'index' AND tbl_name = ?
	        ORDER BY name`
}

func (sqliteDialect) schemasSQL() string { return `SELECT 'main'` }

func (sqliteDialect) columnsAllSQL() string {
	return `SELECT 'main.' || m.name, p.name
	        FROM sqlite_master m JOIN pragma_table_info(m.name) p
	        WHERE m.type IN ('table','view') AND m.name NOT LIKE 'sqlite_%'
	        ORDER BY 1, p.cid`
}

func (sqliteDialect) functionsSQL() string { return "" }

func (sqliteDialect) versionSQL() string { return `SELECT 'SQLite ' || sqlite_version()` }
