package api

import "strings"

// errorCategory buckets a raw error message into one of a handful of
// non-identifying categories for telemetry. The raw message itself is never
// sent -- it can carry a hostname, path, or database name -- only which
// bucket it falls into.
func errorCategory(msg string) string {
	m := strings.ToLower(msg)
	switch {
	case strings.Contains(m, "timeout") || strings.Contains(m, "deadline exceeded"):
		return "timeout"
	case strings.Contains(m, "password") || strings.Contains(m, "auth") || strings.Contains(m, "credential"):
		return "auth"
	case strings.Contains(m, "refused") || strings.Contains(m, "no such host") || strings.Contains(m, "unreachable") ||
		strings.Contains(m, "dial") || strings.Contains(m, "network"):
		return "network"
	case strings.Contains(m, "tls") || strings.Contains(m, "certificate") || strings.Contains(m, "ssl"):
		return "tls"
	case msg == "":
		return "unknown"
	default:
		return "other"
	}
}
