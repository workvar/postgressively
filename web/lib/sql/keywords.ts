/** SQL keywords offered by the console's type-ahead, upper-cased on insert. */
export const SQL_KEYWORDS = [
  "SELECT", "FROM", "WHERE", "GROUP BY", "HAVING", "ORDER BY", "LIMIT", "OFFSET",
  "INSERT INTO", "VALUES", "UPDATE", "SET", "DELETE FROM", "RETURNING",
  "JOIN", "INNER JOIN", "LEFT JOIN", "RIGHT JOIN", "FULL JOIN", "CROSS JOIN",
  "ON", "USING", "AS", "DISTINCT", "DISTINCT ON", "UNION", "UNION ALL",
  "INTERSECT", "EXCEPT", "WITH", "RECURSIVE", "CASE", "WHEN", "THEN", "ELSE", "END",
  "AND", "OR", "NOT", "IN", "EXISTS", "BETWEEN", "LIKE", "ILIKE", "IS NULL",
  "IS NOT NULL", "ASC", "DESC", "NULLS FIRST", "NULLS LAST",
  "CREATE TABLE", "CREATE INDEX", "CREATE VIEW", "CREATE SCHEMA", "CREATE EXTENSION",
  "ALTER TABLE", "ADD COLUMN", "DROP COLUMN", "RENAME TO", "DROP TABLE", "DROP INDEX",
  "TRUNCATE", "PRIMARY KEY", "FOREIGN KEY", "REFERENCES", "UNIQUE", "CHECK",
  "DEFAULT", "NOT NULL", "GENERATED ALWAYS AS IDENTITY",
  "BEGIN", "COMMIT", "ROLLBACK", "EXPLAIN", "ANALYZE", "VACUUM", "GRANT", "REVOKE",
  "OVER", "PARTITION BY", "WINDOW", "FILTER", "LATERAL", "ARRAY", "CAST",
];

/** Types offered after a column name in DDL. */
export const SQL_TYPES = [
  "bigint", "bigserial", "boolean", "bytea", "char", "date", "double precision",
  "integer", "interval", "json", "jsonb", "numeric", "real", "serial", "smallint",
  "text", "time", "timestamp", "timestamptz", "uuid", "varchar", "inet", "cidr",
];

/** Built-ins worth suggesting even when the catalog scan misses them. */
export const SQL_FUNCTIONS = [
  "count", "sum", "avg", "min", "max", "coalesce", "nullif", "greatest", "least",
  "now", "current_date", "current_timestamp", "date_trunc", "extract", "age",
  "length", "lower", "upper", "trim", "substring", "replace", "split_part",
  "concat", "string_agg", "array_agg", "json_agg", "jsonb_build_object",
  "row_number", "rank", "dense_rank", "lag", "lead", "generate_series",
  "pg_size_pretty", "pg_database_size", "pg_total_relation_size", "version",
];
