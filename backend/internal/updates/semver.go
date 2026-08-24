package updates

import (
	"fmt"
	"strconv"
	"strings"
)

// NormalizeTag ensures a leading "v" for comparison/display.
func NormalizeTag(tag string) string {
	tag = strings.TrimSpace(tag)
	if tag == "" {
		return ""
	}
	if strings.HasPrefix(tag, "v") || strings.HasPrefix(tag, "V") {
		return "v" + strings.TrimPrefix(strings.TrimPrefix(tag, "v"), "V")
	}
	return "v" + tag
}

// Compare returns -1 if current < latest, 0 if equal, 1 if current > latest.
func Compare(current, latest string) (int, error) {
	a, err := parse(NormalizeTag(current))
	if err != nil {
		return 0, fmt.Errorf("current: %w", err)
	}
	b, err := parse(NormalizeTag(latest))
	if err != nil {
		return 0, fmt.Errorf("latest: %w", err)
	}
	for i := 0; i < 3; i++ {
		if a.num[i] < b.num[i] {
			return -1, nil
		}
		if a.num[i] > b.num[i] {
			return 1, nil
		}
	}
	// Pre-release (anything after -) is older than the same numeric version.
	if a.pre == "" && b.pre != "" {
		return 1, nil
	}
	if a.pre != "" && b.pre == "" {
		return -1, nil
	}
	if a.pre < b.pre {
		return -1, nil
	}
	if a.pre > b.pre {
		return 1, nil
	}
	return 0, nil
}

// UpdateAvailable is true when latest is a newer release than current.
// "dev" and empty builds never report an update.
func UpdateAvailable(current, latest string) bool {
	current = strings.TrimSpace(current)
	latest = strings.TrimSpace(latest)
	if current == "" || current == "dev" || latest == "" {
		return false
	}
	cmp, err := Compare(current, latest)
	return err == nil && cmp < 0
}

type ver struct {
	num [3]int
	pre string
}

func parse(tag string) (ver, error) {
	tag = strings.TrimPrefix(NormalizeTag(tag), "v")
	if tag == "" || tag == "dev" {
		return ver{}, fmt.Errorf("not a release tag")
	}
	pre := ""
	if i := strings.IndexByte(tag, '-'); i >= 0 {
		pre = tag[i+1:]
		tag = tag[:i]
	}
	parts := strings.Split(tag, ".")
	if len(parts) < 1 || len(parts) > 3 {
		return ver{}, fmt.Errorf("invalid version %q", tag)
	}
	var v ver
	v.pre = pre
	for i := 0; i < len(parts) && i < 3; i++ {
		n, err := strconv.Atoi(parts[i])
		if err != nil {
			return ver{}, fmt.Errorf("invalid version %q", tag)
		}
		v.num[i] = n
	}
	return v, nil
}
