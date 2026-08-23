package engine

import (
	"fmt"
	"net/url"
	"path/filepath"
	"regexp"
	"strings"
)

// DatabaseOf reports the database encoded in a normalized connection string.
func DatabaseOf(k Kind, dsn string) string {
	switch k {
	case Postgres:
		if u, err := url.Parse(dsn); err == nil {
			return strings.TrimPrefix(u.Path, "/")
		}
		return kvLookup(dsn, "dbname")
	case MySQL:
		return mysqlPart(dsn).database
	case SQLite:
		return filepath.Base(strings.TrimPrefix(strings.SplitN(dsn, "?", 2)[0], "file:"))
	case SQLServer:
		if u, err := url.Parse(dsn); err == nil {
			return u.Query().Get("database")
		}
		return kvLookup(dsn, "database")
	}
	return ""
}

// WithDatabase points a connection string at a different database on the same
// server, which is how ?db= is served for saved connections.
func WithDatabase(k Kind, dsn, database string) (string, error) {
	if database == "" {
		return dsn, nil
	}
	switch k {
	case Postgres:
		u, err := url.Parse(dsn)
		if err != nil {
			return "", err
		}
		u.Path = "/" + database
		return u.String(), nil
	case MySQL:
		p := mysqlPart(dsn)
		return p.rebuild(database), nil
	case SQLServer:
		u, err := url.Parse(dsn)
		if err != nil {
			return "", err
		}
		q := u.Query()
		q.Set("database", database)
		u.RawQuery = q.Encode()
		return u.String(), nil
	case SQLite:
		return dsn, nil // one file, one database
	}
	return "", fmt.Errorf("unsupported engine %q", k)
}

// Endpoint is the host:port (or file name) shown next to a connection's name.
func Endpoint(k Kind, dsn string) string {
	switch k {
	case Postgres, SQLServer:
		if u, err := url.Parse(dsn); err == nil && u.Host != "" {
			return u.Host
		}
		return kvLookup(dsn, "host")
	case MySQL:
		return mysqlPart(dsn).address
	case SQLite:
		return strings.TrimPrefix(strings.SplitN(dsn, "?", 2)[0], "file:")
	}
	return ""
}

var (
	urlPassword = regexp.MustCompile(`^([^:@/]+):([^@]*)@`)
	kvPassword  = regexp.MustCompile(`(?i)\b(password|pwd)=([^;\s]*)`)
)

// Redact removes the password so a connection string is safe to show and to
// write into the audit log. It is never used to reconnect.
func Redact(k Kind, dsn string) string {
	switch k {
	case Postgres, SQLServer:
		if u, err := url.Parse(dsn); err == nil && u.User != nil {
			if _, ok := u.User.Password(); ok {
				u.User = url.UserPassword(u.User.Username(), "***")
			}
			return u.String()
		}
		return kvPassword.ReplaceAllString(dsn, "$1=***")
	case MySQL:
		return urlPassword.ReplaceAllString(dsn, "$1:***@")
	case SQLite:
		return dsn
	}
	return "***"
}

// mysqlParts splits the driver's own DSN form: user:pass@tcp(addr)/db?params.
type mysqlParts struct {
	credentials string // "user:pass@" including the trailing @, or ""
	network     string // "tcp(host:port)" or "unix(/path)"
	address     string // "host:port"
	database    string
	params      string // without the leading ?
}

var mysqlDSN = regexp.MustCompile(`^(?:(.*)@)?([a-z]+\(([^)]*)\))?/([^?]*)(?:\?(.*))?$`)

func mysqlPart(dsn string) mysqlParts {
	m := mysqlDSN.FindStringSubmatch(dsn)
	if m == nil {
		return mysqlParts{}
	}
	p := mysqlParts{network: m[2], address: m[3], database: m[4], params: m[5]}
	if m[1] != "" {
		p.credentials = m[1] + "@"
	}
	return p
}

func (p mysqlParts) rebuild(database string) string {
	out := p.credentials + p.network + "/" + database
	if p.params != "" {
		out += "?" + p.params
	}
	return out
}

// kvLookup reads one value out of a "key=value key=value" connection string.
func kvLookup(dsn, key string) string {
	fields := strings.FieldsFunc(dsn, func(r rune) bool { return r == ' ' || r == ';' })
	for _, f := range fields {
		k, v, ok := strings.Cut(f, "=")
		if ok && strings.EqualFold(strings.TrimSpace(k), key) {
			return strings.TrimSpace(v)
		}
	}
	return ""
}
