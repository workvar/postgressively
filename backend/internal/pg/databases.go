package pg

import (
	"context"

	"github.com/jackc/pgx/v5"
)

// DatabaseDetail is the richer per-database view used by the Databases page.
type DatabaseDetail struct {
	Name            string `json:"name"`
	Owner           string `json:"owner"`
	Size            int64  `json:"sizeBytes"`
	Encoding        string `json:"encoding"`
	Collate         string `json:"collate"`
	Ctype           string `json:"ctype"`
	ConnectionLimit int    `json:"connectionLimit"`
	AllowConnect    bool   `json:"allowConnections"`
	IsTemplate      bool   `json:"isTemplate"`
	Connections     int    `json:"activeConnections"`
	IsCurrent       bool   `json:"isCurrent"`
}

const databaseDetailQuery = `
SELECT d.datname,
       pg_get_userbyid(d.datdba),
       pg_database_size(d.datname),
       pg_encoding_to_char(d.encoding),
       d.datcollate,
       d.datctype,
       d.datconnlimit,
       d.datallowconn,
       d.datistemplate,
       COALESCE((SELECT count(*) FROM pg_stat_activity a WHERE a.datname = d.datname), 0),
       d.datname = current_database()
FROM pg_database d
WHERE NOT d.datistemplate
ORDER BY 1`

// DatabaseDetails lists every non-template database with its settings.
func (s *Store) DatabaseDetails(ctx context.Context) ([]DatabaseDetail, error) {
	rows, err := s.Pool.Query(ctx, databaseDetailQuery)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []DatabaseDetail{}
	for rows.Next() {
		var d DatabaseDetail
		if err := rows.Scan(
			&d.Name, &d.Owner, &d.Size, &d.Encoding, &d.Collate, &d.Ctype,
			&d.ConnectionLimit, &d.AllowConnect, &d.IsTemplate, &d.Connections, &d.IsCurrent,
		); err != nil {
			return nil, err
		}
		out = append(out, d)
	}
	return out, rows.Err()
}

// Extension is an installed extension inside one database.
type Extension struct {
	Name    string `json:"name"`
	Version string `json:"version"`
	Schema  string `json:"schema"`
}

// Extensions opens a short-lived connection to the named database and lists its extensions.
func (s *Store) Extensions(ctx context.Context, database string) ([]Extension, error) {
	if err := ValidIdent(database); err != nil {
		return nil, err
	}

	cfg := s.Pool.Config().ConnConfig.Copy()
	cfg.Database = database

	conn, err := pgx.ConnectConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	defer conn.Close(ctx)

	const q = `SELECT e.extname, e.extversion, n.nspname
	           FROM pg_extension e JOIN pg_namespace n ON n.oid = e.extnamespace
	           ORDER BY 1`
	rows, err := conn.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Extension{}
	for rows.Next() {
		var e Extension
		if err := rows.Scan(&e.Name, &e.Version, &e.Schema); err != nil {
			return nil, err
		}
		out = append(out, e)
	}
	return out, rows.Err()
}
