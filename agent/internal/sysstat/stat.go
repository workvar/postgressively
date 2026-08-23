package sysstat

import "syscall"

// Snapshot returns coarse host metrics. Load, memory, and uptime are read by
// the per-platform implementations in stat_linux.go and stat_darwin.go.
func Snapshot(dataDir string) map[string]any {
	return map[string]any{
		"loadAverage": loadAvg(),
		"memory":      memory(),
		"disk":        disk(dataDir),
		"uptime":      uptime(),
	}
}

func disk(path string) map[string]uint64 {
	if path == "" {
		path = "/"
	}
	var st syscall.Statfs_t
	if err := syscall.Statfs(path, &st); err != nil {
		// The configured path may not exist yet; fall back to the root volume.
		if path == "/" || syscall.Statfs("/", &st) != nil {
			return nil
		}
	}
	total := st.Blocks * uint64(st.Bsize)
	free := st.Bavail * uint64(st.Bsize)
	return map[string]uint64{"totalBytes": total, "freeBytes": free, "usedBytes": total - free}
}
