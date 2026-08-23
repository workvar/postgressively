//go:build darwin

package sysstat

import (
	"context"
	"os/exec"
	"strings"
	"time"
)

// runCmd executes a short-lived metrics command and returns trimmed output.
func runCmd(timeout time.Duration, name string, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(context.Background(), timeout)
	defer cancel()
	out, err := exec.CommandContext(ctx, name, args...).Output()
	return strings.TrimSpace(string(out)), err
}
