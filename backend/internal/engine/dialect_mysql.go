package engine

import (
	"fmt"
	"strings"
)

// mysqlDialect covers MySQL and MariaDB, which share information_schema.
// A MySQL "schema" is a database, so the schema column repeats the database
// name and the queries scope themselves with DATABASE().
type mysqlDialect struct{}

func (mysqlDialect) kind() Kind { return MySQL }

func (mysqlDialect) quote(name string) string {
	return "`" + strings.ReplaceAll(name, "`", "``") + "`"
}

func (d mysqlDialect) qualify(schema, table string) string {
	if schema == "" {
		return d.quote(table)
	}
	return d.quote(schema) + "." + d.quote(table)
}

func (d mysqlDialect) previewSQL(schema, table string, limit int) string {
	return fmt.Sprintf("SELECT * FROM %s LIMIT %d", d.qualify(schema, table), limit)
}

func (mysqlDialect) placeholder(int) string { return "?" }

func (mysqlDialect) databasesSQL() string {
	return `SELECT s.schema_name, '',
	               COALESCE((SELECT SUM(t.data_length + t.index_length)
	                         FROM information_schema.tables t
	                         WHERE t.table_schema = s.schema_name), 0)
	        FROM information_schema.schemata s
	        WHERE s.schema_name NOT IN ('information_schema','performance_schema','mysql','sys')
	        ORDER BY 1`
}

func (mysqlDialect) tablesSQL() string {
	return `SELECT table_schema, table_name,
	               CASE table_type WHEN 'VIEW' THEN 'view' ELSE 'table' END,
	               COALESCE(table_rows, 0),
	               COALESCE(data_length + index_length, 0)
	        FROM information_schema.tables
	        WHERE table_schema = DATABASE()
	        ORDER BY 1, 2`
}

func (mysqlDialect) columnsSQL() string {
	return `SELECT column_name, column_type, is_nullable = 'YES',
	               column_default, column_key = 'PRI'
	        FROM information_schema.columns
	        WHERE table_schema = COALESCE(NULLIF(?, ''), DATABASE()) AND table_name = ?
	        ORDER BY ordinal_position`
}

func (mysqlDialect) indexesSQL() string {
	return `SELECT index_name,
	               CONCAT(IF(MAX(non_unique) = 0, 'UNIQUE (', '('),
	                      GROUP_CONCAT(column_name ORDER BY seq_in_index SEPARATOR ', '), ')')
	        FROM information_schema.statistics
	        WHERE table_schema = COALESCE(NULLIF(?, ''), DATABASE()) AND table_name = ?
	        GROUP BY index_name
	        ORDER BY index_name`
}

func (mysqlDialect) schemasSQL() string {
	return `SELECT schema_name FROM information_schema.schemata
	        WHERE schema_name NOT IN ('information_schema','performance_schema','mysql','sys')
	        ORDER BY 1`
}

func (mysqlDialect) columnsAllSQL() string {
	return `SELECT CONCAT(table_schema, '.', table_name), column_name
	        FROM information_schema.columns
	        WHERE table_schema = DATABASE()
	        ORDER BY 1, ordinal_position`
}

func (mysqlDialect) functionsSQL() string {
	return `SELECT routine_name FROM information_schema.routines
	        WHERE routine_schema = DATABASE() ORDER BY 1 LIMIT 800`
}

func (mysqlDialect) versionSQL() string { return `SELECT VERSION()` }

func (mysqlDialect) introspectArgs(schema, table string) []any { return []any{schema, table} }
