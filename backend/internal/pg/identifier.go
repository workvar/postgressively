package pg

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"strings"
)

// ValidIdent guards identifiers interpolated into DDL. Anything Postgres
// accepts as a quoted identifier is allowed (mixed case, hyphens, spaces);
// quoteIdent always double-quotes and escapes embedded quotes. The create
// wizard keeps a stricter client-side name rule for new databases.
func ValidIdent(name string) error {
	if name == "" || len(name) > 63 || strings.ContainsRune(name, 0) {
		return fmt.Errorf("invalid identifier %q: must be 1-63 bytes and contain no null bytes", name)
	}
	return nil
}

// quoteIdent double-quotes an identifier that has already passed ValidIdent.
func quoteIdent(name string) string {
	return `"` + strings.ReplaceAll(name, `"`, `""`) + `"`
}

// quoteLiteral single-quotes a string literal for DDL that cannot take parameters.
func quoteLiteral(v string) string {
	return "'" + strings.ReplaceAll(v, "'", "''") + "'"
}

// AllowedEncodings and AllowedLocales keep DDL input to a known set.
var AllowedEncodings = map[string]bool{"UTF8": true, "LATIN1": true, "SQL_ASCII": true}

var AllowedLocales = map[string]bool{"en_US.UTF-8": true, "C": true, "POSIX": true}

// AllowedExtensions is the set the wizard may install.
var AllowedExtensions = map[string]bool{
	"uuid-ossp":          true,
	"pgcrypto":           true,
	"pg_stat_statements": true,
	"postgis":            true,
	"vector":             true,
	"hstore":             true,
	"citext":             true,
	"tablefunc":          true,
}

// GeneratePassword returns a URL-safe random password.
func GeneratePassword() (string, error) {
	buf := make([]byte, 18)
	if _, err := rand.Read(buf); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buf), nil
}
