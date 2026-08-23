package discover

import (
	"context"
	"os/exec"
	"regexp"
	"strconv"
	"strings"
	"time"
)

// listenerProcesses maps listening TCP ports to the process holding them.
// Both probes are best-effort: lsof and ss may be absent or restricted, in
// which case discovery still works from ports and binaries alone.
func listenerProcesses(ctx context.Context) map[int]string {
	if out, err := runTool(ctx, "lsof", "-nP", "-iTCP", "-sTCP:LISTEN", "-F", "cn"); err == nil {
		if m := parseLsof(out); len(m) > 0 {
			return m
		}
	}
	if out, err := runTool(ctx, "ss", "-ltnp"); err == nil {
		return parseSS(out)
	}
	return map[int]string{}
}

func runTool(ctx context.Context, name string, args ...string) (string, error) {
	if _, err := exec.LookPath(name); err != nil {
		return "", err
	}
	ctx, cancel := context.WithTimeout(ctx, 5*time.Second)
	defer cancel()
	out, err := exec.CommandContext(ctx, name, args...).Output()
	// Both tools exit non-zero when some entries are unreadable; keep the rest.
	if len(out) == 0 && err != nil {
		return "", err
	}
	return string(out), nil
}

// parseLsof reads the -F cn field stream, where "c" lines set the current
// command and "n" lines carry an address for it.
func parseLsof(out string) map[int]string {
	result := map[int]string{}
	command := ""
	for _, line := range strings.Split(out, "\n") {
		if len(line) < 2 {
			continue
		}
		switch line[0] {
		case 'c':
			command = line[1:]
		case 'n':
			if port, ok := portFromAddr(line[1:]); ok && command != "" {
				result[port] = command
			}
		}
	}
	return result
}

var ssProcess = regexp.MustCompile(`users:\(\("([^"]+)"`)

// parseSS reads `ss -ltnp` rows, taking the local address and process name.
func parseSS(out string) map[int]string {
	result := map[int]string{}
	for _, line := range strings.Split(out, "\n") {
		fields := strings.Fields(line)
		if len(fields) < 4 || !strings.Contains(line, "users:") {
			continue
		}
		port, ok := portFromAddr(fields[3])
		if !ok {
			continue
		}
		if m := ssProcess.FindStringSubmatch(line); len(m) == 2 {
			result[port] = m[1]
		}
	}
	return result
}

// portFromAddr pulls the port out of forms like "127.0.0.1:5432", "*:5432",
// and "[::1]:5432".
func portFromAddr(addr string) (int, bool) {
	idx := strings.LastIndex(addr, ":")
	if idx < 0 {
		return 0, false
	}
	port, err := strconv.Atoi(strings.TrimSpace(addr[idx+1:]))
	if err != nil || port <= 0 {
		return 0, false
	}
	return port, true
}
