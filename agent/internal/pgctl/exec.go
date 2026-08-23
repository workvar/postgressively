package pgctl

import (
	"context"
	"os/exec"
	"strings"
	"time"
)

// run executes a command with a timeout and returns combined output.
func run(ctx context.Context, timeout time.Duration, name string, args ...string) (string, error) {
	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()
	out, err := exec.CommandContext(ctx, name, args...).CombinedOutput()
	return strings.TrimSpace(string(out)), err
}

// joinErr builds a readable message from command output and its error.
func joinErr(out string, err error) string {
	if out == "" {
		return err.Error()
	}
	return out + ": " + err.Error()
}
