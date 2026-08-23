package engine

import (
	"fmt"
	"strings"
)

// sqlserverDialect reads the current database through information_schema and
// sys, and uses TOP rather than LIMIT.
type sqlserverDialect struct{}

func (sqlserverDialect) kind() Kind { return SQLServer }

func (sqlserverDialect) quote(name string) string {
	return "[" + strings.ReplaceAll(name, "]", "]]") + "]"
}

func (d sqlserverDialect) qualify(schema, table string) string {
	if schema == "" {
		schema = "dbo"
	}
	return d.quote(schema) + "." + d.quote(table)
}

func (d sqlserverDialect) previewSQL(schema, table string, limit int) string {
	return fmt.Sprintf("SELECT TOP %d * FROM %s", limit, d.qualify(schema, table))
}

func (sqlserverDialect) placeholder(n int) string { return fmt.Sprintf("@p%d", n) }

func (sqlserverDialect) introspectArgs(schema, table string) []any {
	if schema == "" {
		schema = "dbo"
	}
	return []any{schema, table}
}

func (sqlserverDialect) databasesSQL() string {
	return `SELECT d.name, COALESCE(SUSER_SNAME(d.owner_sid), ''), 0
	        FROM sys.databases d
	        WHERE d.database_id > 4 AND d.state = 0
	        ORDER BY 1`
}

func (sqlserverDialect) tablesSQL() string {
	return `SELECT s.name, t.name, 'table',
	               COALESCE(p.rows, 0),
	               COALESCE(p.reserved, 0)
	        FROM sys.tables t
	        JOIN sys.schemas s ON s.schema_id = t.schema_id
	        OUTER APPLY (
	            SELECT TOP 1 pt.rows, SUM(au.total_pages) * 8192 AS reserved
	            FROM sys.partitions pt
	            JOIN sys.allocation_units au ON au.container_id = pt.partition_id
	            WHERE pt.object_id = t.object_id AND pt.index_id IN (0, 1)
	            GROUP BY pt.rows
	        ) p
	        UNION ALL
	        SELECT s.name, v.name, 'view', 0, 0
	        FROM sys.views v
	        JOIN sys.schemas s ON s.schema_id = v.schema_id
	        ORDER BY 1, 2`
}

func (sqlserverDialect) columnsSQL() string {
	return `SELECT c.column_name,
	               c.data_type + COALESCE('(' + CASE WHEN c.character_maximum_length = -1
	                                                 THEN 'max'
	                                                 ELSE CAST(c.character_maximum_length AS varchar(12)) END + ')', ''),
	               CAST(CASE WHEN c.is_nullable = 'YES' THEN 1 ELSE 0 END AS bit),
	               c.column_default,
	               CAST(CASE WHEN k.column_name IS NULL THEN 0 ELSE 1 END AS bit)
	        FROM information_schema.columns c
	        LEFT JOIN (
	            SELECT ku.table_schema, ku.table_name, ku.column_name
	            FROM information_schema.table_constraints tc
	            JOIN information_schema.key_column_usage ku
	              ON ku.constraint_name = tc.constraint_name
	            WHERE tc.constraint_type = 'PRIMARY KEY'
	        ) k ON k.table_schema = c.table_schema
	           AND k.table_name = c.table_name
	           AND k.column_name = c.column_name
	        WHERE c.table_schema = @p1 AND c.table_name = @p2
	        ORDER BY c.ordinal_position`
}

func (sqlserverDialect) indexesSQL() string {
	return `SELECT i.name,
	               CASE WHEN i.is_unique = 1 THEN 'UNIQUE ' ELSE '' END + i.type_desc
	        FROM sys.indexes i
	        JOIN sys.tables t ON t.object_id = i.object_id
	        JOIN sys.schemas s ON s.schema_id = t.schema_id
	        WHERE s.name = @p1 AND t.name = @p2 AND i.name IS NOT NULL
	        ORDER BY i.name`
}

func (sqlserverDialect) schemasSQL() string {
	return `SELECT name FROM sys.schemas
	        WHERE name NOT IN ('sys','INFORMATION_SCHEMA') AND name NOT LIKE 'db[_]%'
	        ORDER BY 1`
}

func (sqlserverDialect) columnsAllSQL() string {
	return `SELECT table_schema + '.' + table_name, column_name
	        FROM information_schema.columns
	        ORDER BY 1, ordinal_position`
}

func (sqlserverDialect) functionsSQL() string {
	return `SELECT DISTINCT routine_name FROM information_schema.routines ORDER BY 1`
}

func (sqlserverDialect) versionSQL() string { return `SELECT @@VERSION` }
