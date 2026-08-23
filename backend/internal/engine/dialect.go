package engine

import "fmt"

// dialect is the per-engine half of the introspection code: the SQL text and
// the quoting rules. Everything that runs the statements and scans the rows is
// shared, so adding an engine means adding one small file here.
type dialect interface {
	kind() Kind

	// quote wraps a single identifier for this engine.
	quote(name string) string
	// qualify builds a table reference, dropping the schema on engines
	// that do not have one.
	qualify(schema, table string) string
	// previewSQL selects the first limit rows of one relation.
	previewSQL(schema, table string, limit int) string

	// placeholder renders bind marker n, counting from 1.
	placeholder(n int) string

	// The introspection statements. Those taking arguments are documented
	// with the order the shared code binds them in.
	databasesSQL() string
	tablesSQL() string
	// columnsSQL and indexesSQL bind the values introspectArgs returns.
	columnsSQL() string
	indexesSQL() string
	// introspectArgs maps one relation onto this engine's bind values.
	// Engines without a schema layer drop the schema.
	introspectArgs(schema, table string) []any
	schemasSQL() string
	// columnsAllSQL returns ("schema.table", column) for the whole database.
	columnsAllSQL() string
	// functionsSQL may return "" where the engine has no routine catalog.
	functionsSQL() string
	// versionSQL returns a single text column.
	versionSQL() string
}

func dialectFor(k Kind) (dialect, error) {
	switch k {
	case Postgres:
		return postgresDialect{}, nil
	case MySQL:
		return mysqlDialect{}, nil
	case SQLite:
		return sqliteDialect{}, nil
	case SQLServer:
		return sqlserverDialect{}, nil
	}
	return nil, fmt.Errorf("unsupported engine %q", k)
}
