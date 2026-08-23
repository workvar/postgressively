package discover

import (
	"context"
	"net"
	"strconv"
	"sync"
	"time"
)

// dialTimeout is deliberately short: everything probed is on loopback, so a
// slow response means nothing is there.
const dialTimeout = 300 * time.Millisecond

// listening reports which of the given ports accept a TCP connection on host.
// Probes run concurrently so a full scan stays well under a second.
func listening(ctx context.Context, host string, ports []int) map[int]bool {
	var (
		mu  sync.Mutex
		wg  sync.WaitGroup
		out = make(map[int]bool, len(ports))
	)

	dialer := net.Dialer{Timeout: dialTimeout}
	for _, port := range ports {
		wg.Add(1)
		go func(port int) {
			defer wg.Done()
			conn, err := dialer.DialContext(ctx, "tcp", net.JoinHostPort(host, strconv.Itoa(port)))
			if err != nil {
				return
			}
			conn.Close()
			mu.Lock()
			out[port] = true
			mu.Unlock()
		}(port)
	}

	wg.Wait()
	return out
}

// candidatePorts is every port in the catalog, deduplicated.
func candidatePorts(extra []int) []int {
	seen := map[int]bool{}
	out := []int{}
	add := func(p int) {
		if p > 0 && !seen[p] {
			seen[p] = true
			out = append(out, p)
		}
	}
	for _, e := range engines {
		for _, p := range e.Ports {
			add(p)
		}
	}
	for _, p := range extra {
		add(p)
	}
	return out
}

// engineForPort returns the engine whose catalog claims this port.
func engineForPort(port int) (string, bool) {
	for _, e := range engines {
		for _, p := range e.Ports {
			if p == port {
				return e.ID, true
			}
		}
	}
	return "", false
}
