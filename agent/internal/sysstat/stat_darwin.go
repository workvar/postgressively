//go:build darwin

package sysstat

import (
	"regexp"
	"strconv"
	"strings"
	"time"
)

func loadAvg() []float64 {
	// vm.loadavg is reported as "{ 1.83 1.94 2.01 }".
	fields := strings.Fields(strings.Trim(sysctl("vm.loadavg"), "{} "))
	out := make([]float64, 0, 3)
	for i := 0; i < 3 && i < len(fields); i++ {
		v, err := strconv.ParseFloat(fields[i], 64)
		if err != nil {
			return nil
		}
		out = append(out, v)
	}
	if len(out) == 0 {
		return nil
	}
	return out
}

func memory() map[string]uint64 {
	total, err := strconv.ParseUint(sysctl("hw.memsize"), 10, 64)
	if err != nil {
		return nil
	}
	out := map[string]uint64{"MemTotalBytes": total}
	if available, ok := vmAvailable(); ok {
		out["MemAvailableBytes"] = available
	}
	if swapTotal, swapFree, ok := swapUsage(); ok {
		out["SwapTotalBytes"] = swapTotal
		out["SwapFreeBytes"] = swapFree
	}
	return out
}

func uptime() float64 {
	// kern.boottime is reported as "{ sec = 1712345678, usec = 0 } Mon Apr ...".
	m := regexp.MustCompile(`sec\s*=\s*(\d+)`).FindStringSubmatch(sysctl("kern.boottime"))
	if len(m) < 2 {
		return 0
	}
	boot, err := strconv.ParseInt(m[1], 10, 64)
	if err != nil || boot == 0 {
		return 0
	}
	return time.Since(time.Unix(boot, 0)).Seconds()
}

// vmAvailable sums the vm_stat page counts that can be reclaimed on demand.
func vmAvailable() (uint64, bool) {
	out, err := runCmd(3*time.Second, "vm_stat")
	if err != nil {
		return 0, false
	}

	pageSize := uint64(4096)
	if m := regexp.MustCompile(`page size of (\d+) bytes`).FindStringSubmatch(out); len(m) == 2 {
		if v, err := strconv.ParseUint(m[1], 10, 64); err == nil {
			pageSize = v
		}
	}

	reclaimable := map[string]bool{
		"Pages free": true, "Pages inactive": true,
		"Pages speculative": true, "Pages purgeable": true,
	}
	var pages uint64
	for _, line := range strings.Split(out, "\n") {
		key, value, found := strings.Cut(line, ":")
		if !found || !reclaimable[strings.TrimSpace(key)] {
			continue
		}
		v, err := strconv.ParseUint(strings.Trim(strings.TrimSpace(value), "."), 10, 64)
		if err != nil {
			continue
		}
		pages += v
	}
	if pages == 0 {
		return 0, false
	}
	return pages * pageSize, true
}

// swapUsage parses vm.swapusage, e.g. "total = 2048.00M  used = 512.00M  free = 1536.00M".
func swapUsage() (total, free uint64, ok bool) {
	raw := sysctl("vm.swapusage")
	if raw == "" {
		return 0, 0, false
	}
	find := func(key string) (uint64, bool) {
		m := regexp.MustCompile(key + `\s*=\s*([\d.]+)([KMG])`).FindStringSubmatch(raw)
		if len(m) < 3 {
			return 0, false
		}
		v, err := strconv.ParseFloat(m[1], 64)
		if err != nil {
			return 0, false
		}
		mult := map[string]float64{"K": 1 << 10, "M": 1 << 20, "G": 1 << 30}[m[2]]
		return uint64(v * mult), true
	}
	t, okT := find("total")
	f, okF := find("free")
	return t, f, okT && okF
}

func sysctl(key string) string {
	out, err := runCmd(3*time.Second, "sysctl", "-n", key)
	if err != nil {
		return ""
	}
	return out
}
