//go:build linux

package sysstat

import (
	"bufio"
	"os"
	"strconv"
	"strings"
)

func loadAvg() []float64 {
	b, err := os.ReadFile("/proc/loadavg")
	if err != nil {
		return nil
	}
	parts := strings.Fields(string(b))
	out := make([]float64, 0, 3)
	for i := 0; i < 3 && i < len(parts); i++ {
		v, _ := strconv.ParseFloat(parts[i], 64)
		out = append(out, v)
	}
	return out
}

func memory() map[string]uint64 {
	f, err := os.Open("/proc/meminfo")
	if err != nil {
		return nil
	}
	defer f.Close()
	want := map[string]bool{"MemTotal": true, "MemAvailable": true, "SwapTotal": true, "SwapFree": true}
	out := map[string]uint64{}
	sc := bufio.NewScanner(f)
	for sc.Scan() {
		fields := strings.Fields(sc.Text())
		if len(fields) < 2 {
			continue
		}
		key := strings.TrimSuffix(fields[0], ":")
		if !want[key] {
			continue
		}
		v, _ := strconv.ParseUint(fields[1], 10, 64)
		out[key+"Bytes"] = v * 1024
	}
	return out
}

func uptime() float64 {
	b, err := os.ReadFile("/proc/uptime")
	if err != nil {
		return 0
	}
	f := strings.Fields(string(b))
	if len(f) == 0 {
		return 0
	}
	v, _ := strconv.ParseFloat(f[0], 64)
	return v
}
