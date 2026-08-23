package pg

import (
	"crypto/rand"
	"encoding/base64"
	"fmt"
	"regexp"
	"strings"
)

var identRe = regexp.MustCompile(`^[a-z_][a-z0-9_]{0,62}$`)

// ValidIdent guards every identifier that is interpolated into DDL.
func ValidIdent(name string) error {
	if !identRe.MatchString(name) {
		return fmt.Errorf("invalid identifier %q: use 1-63 lowercase letters, digits or underscores, not starting with a digit", name)
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
