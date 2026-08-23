//go:build linux || darwin

package sysstat

import "syscall"

// syscall.Statfs(_t) isn't available on Windows, so this stays split out
// from stat.go rather than shared unconditionally -- see stat_other.go for
// the fallback on everything else.
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
