package engine

import (
	"strconv"
	"strings"
)

// Drivers disagree about the Go type behind a numeric or boolean column:
// MySQL hands back []byte for a SUM, SQL Server a bit, SQLite an int64. These
// helpers accept all of them so the introspection code can scan into any.

func toInt64(v any) int64 {
	switch t := v.(type) {
	case int64:
		return t
	case int32:
		return int64(t)
	case int:
		return int64(t)
	case float64:
		return int64(t)
	case []byte:
		return parseInt(string(t))
	case string:
		return parseInt(t)
	}
	return 0
}

func parseInt(s string) int64 {
	s = strings.TrimSpace(s)
	if n, err := strconv.ParseInt(s, 10, 64); err == nil {
		return n
	}
	if f, err := strconv.ParseFloat(s, 64); err == nil {
		return int64(f)
	}
	return 0
}

func toBool(v any) bool {
	switch t := v.(type) {
	case bool:
		return t
	case int64:
		return t != 0
	case []byte:
		return isTruthy(string(t))
	case string:
		return isTruthy(t)
	}
	return false
}

func isTruthy(s string) bool {
	switch strings.ToLower(strings.TrimSpace(s)) {
	case "1", "t", "true", "yes", "y":
		return true
	}
	return false
}

func toString(v any) string {
	switch t := v.(type) {
	case string:
		return t
	case []byte:
		return string(t)
	case nil:
		return ""
	}
	return ""
}

// toStringPtr keeps SQL NULL distinct from the empty string, which matters for
// a column default.
func toStringPtr(v any) *string {
	if v == nil {
		return nil
	}
	s := toString(v)
	return &s
}
