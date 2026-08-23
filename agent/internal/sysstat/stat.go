package sysstat

// Snapshot returns coarse host metrics. Load, memory, uptime, and disk are
// read by the per-platform implementations in stat_linux.go, stat_darwin.go,
// stat_unix.go (disk, shared by linux+darwin), and stat_other.go (fallback).
func Snapshot(dataDir string) map[string]any {
	return map[string]any{
		"loadAverage": loadAvg(),
		"memory":      memory(),
		"disk":        disk(dataDir),
		"uptime":      uptime(),
	}
}
