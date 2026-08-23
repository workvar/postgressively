package discover

import (
	"context"
	"os"
	"os/exec"
	"path/filepath"
	"regexp"
	"strings"
	"time"
)

// extraPrefixes cover installs that are commonly absent from a service's PATH,
// notably Homebrew on both Apple silicon and Intel, and Postgres.app.
var extraPrefixes = []string{
	"/opt/homebrew/bin",
	"/opt/homebrew/opt/postgresql/bin",
	"/usr/local/bin",
	"/usr/local/mysql/bin",
	"/usr/lib/postgresql",
	"/Applications/Postgres.app/Contents/Versions/latest/bin",
}

var versionPattern = regexp.MustCompile(`\d+(?:\.\d+)+`)

// findBinary resolves name from PATH, then from the well-known prefixes.
func findBinary(name string) string {
	if p, err := exec.LookPath(name); err == nil {
		return p
	}
	for _, dir := range extraPrefixes {
		candidate := filepath.Join(dir, name)
		if info, err := os.Stat(candidate); err == nil && !info.IsDir() {
			return candidate
		}
		// Versioned Homebrew and Debian layouts, e.g. /usr/lib/postgresql/16/bin.
		matches, _ := filepath.Glob(filepath.Join(dir, "*", "bin", name))
		if len(matches) > 0 {
			return matches[len(matches)-1]
		}
	}
	return ""
}

// binaryVersion runs `<bin> --version` and extracts the first version number.
func binaryVersion(ctx context.Context, bin string) string {
	ctx, cancel := context.WithTimeout(ctx, 3*time.Second)
	defer cancel()

	out, err := exec.CommandContext(ctx, bin, "--version").CombinedOutput()
	if err != nil && len(out) == 0 {
		return ""
	}
	return versionPattern.FindString(strings.TrimSpace(string(out)))
}
