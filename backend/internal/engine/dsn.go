package engine

import (
	"errors"
	"fmt"
	"net/url"
	"strings"
)

// ErrEmptyDSN is returned when a connection string is blank.
var ErrEmptyDSN = errors.New("connection string is required")

// Normalize turns whatever the operator pasted into the exact string the
// driver for that engine expects, and rejects anything it cannot parse. It
// never contacts the server: use Open for that.
func Normalize(k Kind, raw string) (string, error) {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return "", ErrEmptyDSN
	}
	switch k {
	case Postgres:
		return normalizePostgres(raw)
	case MySQL:
		return normalizeMySQL(raw)
	case SQLite:
		return normalizeSQLite(raw)
	case SQLServer:
		return normalizeSQLServer(raw)
	}
	return "", fmt.Errorf("unsupported engine %q", k)
}

func normalizePostgres(raw string) (string, error) {
	if strings.Contains(raw, "=") && !strings.Contains(raw, "://") {
		return raw, nil // key/value form: host=… dbname=…
	}
	u, err := url.Parse(raw)
	if err != nil {
		return "", fmt.Errorf("not a valid Postgres URL: %w", err)
	}
	if u.Scheme != "postgres" && u.Scheme != "postgresql" {
		return "", fmt.Errorf("expected a postgres:// URL, got %q", u.Scheme)
	}
	if u.Host == "" {
		return "", errors.New("the URL is missing a host")
	}
	return u.String(), nil
}

// normalizeMySQL accepts either a mysql:// URL or the driver's own
// user:pass@tcp(host:port)/db form, and always returns the latter.
func normalizeMySQL(raw string) (string, error) {
	if !strings.Contains(raw, "://") {
		return withMySQLDefaults(raw), nil
	}
	u, err := url.Parse(raw)
	if err != nil {
		return "", fmt.Errorf("not a valid MySQL URL: %w", err)
	}
	if u.Scheme != "mysql" && u.Scheme != "mariadb" {
		return "", fmt.Errorf("expected a mysql:// URL, got %q", u.Scheme)
	}
	host := u.Host
	if host == "" {
		return "", errors.New("the URL is missing a host")
	}
	if !strings.Contains(host, ":") {
		host += ":3306"
	}

	var creds string
	if u.User != nil {
		if pw, ok := u.User.Password(); ok {
			creds = u.User.Username() + ":" + pw + "@"
		} else {
			creds = u.User.Username() + "@"
		}
	}

	dsn := fmt.Sprintf("%stcp(%s)/%s", creds, host, strings.TrimPrefix(u.Path, "/"))
	if q := u.RawQuery; q != "" {
		dsn += "?" + q
	}
	return withMySQLDefaults(dsn), nil
}

// withMySQLDefaults asks the driver for real time.Time values, which the
// result normalizer knows how to render.
func withMySQLDefaults(dsn string) string {
	if strings.Contains(dsn, "parseTime=") {
		return dsn
	}
	if strings.Contains(dsn, "?") {
		return dsn + "&parseTime=true"
	}
	return dsn + "?parseTime=true"
}

func normalizeSQLite(raw string) (string, error) {
	if strings.HasPrefix(raw, "file:") {
		return raw, nil
	}
	if strings.Contains(raw, "://") {
		return "", errors.New("SQLite takes a file path, not a URL")
	}
	return raw, nil
}

func normalizeSQLServer(raw string) (string, error) {
	if !strings.Contains(raw, "://") {
		return raw, nil // key/value form: server=…;database=…
	}
	u, err := url.Parse(raw)
	if err != nil {
		return "", fmt.Errorf("not a valid SQL Server URL: %w", err)
	}
	if u.Scheme != "sqlserver" && u.Scheme != "mssql" {
		return "", fmt.Errorf("expected a sqlserver:// URL, got %q", u.Scheme)
	}
	if u.Host == "" {
		return "", errors.New("the URL is missing a host")
	}
	u.Scheme = "sqlserver"
	return u.String(), nil
}
