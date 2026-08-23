package discover

import (
	"context"
	"sort"
)

// Instance is one database found on the host. A row can come from a listening
// port, an installed binary, or both; Source records which.
type Instance struct {
	Engine    string `json:"engine"`
	Label     string `json:"label"`
	Host      string `json:"host,omitempty"`
	Port      int    `json:"port,omitempty"`
	Listening bool   `json:"listening"`
	Process   string `json:"process,omitempty"`
	Version   string `json:"version,omitempty"`
	Binary    string `json:"binary,omitempty"`
	// Managed is true for the instance this agent is configured to control.
	Managed bool `json:"managed"`
	// Source is one of "port", "binary", or "both".
	Source string `json:"source"`
}

// Options tunes a scan. Host and ManagedPort identify the agent's own Postgres
// so it can be flagged rather than reported as a stranger.
type Options struct {
	Host        string
	ManagedPort int
	ExtraPorts  []int
}

// Scan probes well-known database ports on the loopback interface and looks for
// installed server binaries, merging both into one list.
func Scan(ctx context.Context, opts Options) []Instance {
	host := opts.Host
	if host == "" {
		host = "127.0.0.1"
	}

	ports := candidatePorts(append(opts.ExtraPorts, opts.ManagedPort))
	open := listening(ctx, host, ports)
	processes := listenerProcesses(ctx)

	found := fromPorts(ctx, host, opts, open, processes)
	found = append(found, fromBinaries(ctx, found)...)

	sort.Slice(found, func(i, j int) bool {
		if found[i].Listening != found[j].Listening {
			return found[i].Listening // running instances first
		}
		if found[i].Engine != found[j].Engine {
			return found[i].Engine < found[j].Engine
		}
		return found[i].Port < found[j].Port
	})
	return found
}

// fromPorts builds an entry for every port that answered.
func fromPorts(
	ctx context.Context,
	host string,
	opts Options,
	open map[int]bool,
	processes map[int]string,
) []Instance {
	out := []Instance{}
	for port := range open {
		process := processes[port]

		// Trust the process name over the port number: a Postgres on 3306 is
		// still Postgres.
		id, ok := engineForProcess(process)
		if !ok {
			if id, ok = engineForPort(port); !ok {
				continue
			}
		}

		inst := Instance{
			Engine:    id,
			Label:     labelFor(id),
			Host:      host,
			Port:      port,
			Listening: true,
			Process:   process,
			Managed:   port == opts.ManagedPort,
			Source:    "port",
		}
		if bin := binaryFor(id); bin != "" {
			inst.Binary = bin
			inst.Version = binaryVersion(ctx, bin)
			inst.Source = "both"
		}
		out = append(out, inst)
	}
	return out
}

// fromBinaries reports engines that are installed but not currently listening.
func fromBinaries(ctx context.Context, running []Instance) []Instance {
	seen := map[string]bool{}
	for _, i := range running {
		seen[i.Engine] = true
	}

	out := []Instance{}
	for _, e := range engines {
		if seen[e.ID] {
			continue
		}
		bin := binaryFor(e.ID)
		if bin == "" {
			continue
		}
		out = append(out, Instance{
			Engine:  e.ID,
			Label:   e.Label,
			Version: binaryVersion(ctx, bin),
			Binary:  bin,
			Source:  "binary",
		})
	}
	return out
}

// binaryFor returns the first resolvable binary for an engine.
func binaryFor(id string) string {
	for _, e := range engines {
		if e.ID != id {
			continue
		}
		for _, name := range e.Binaries {
			if p := findBinary(name); p != "" {
				return p
			}
		}
	}
	return ""
}
