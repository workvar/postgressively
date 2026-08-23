//go:build !linux && !darwin

package sysstat

// Host metrics are only implemented for Linux and macOS; other platforms
// (Windows included, for the release bundle's windows-amd64 build) report
// empty values rather than failing the whole stats endpoint.

func loadAvg() []float64 { return nil }

func memory() map[string]uint64 { return nil }

func uptime() float64 { return 0 }

func disk(path string) map[string]uint64 { return nil }
