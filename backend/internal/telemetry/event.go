package telemetry

import "time"

// storedEvent is the on-disk / in-flight shape of one queued event. It is
// deliberately decoupled from GA4's own wire format (ga4.go) so a future
// second destination wouldn't need a schema change here, just another
// sender.
type storedEvent struct {
	Name       string         `json:"name"`
	Properties map[string]any `json:"properties"`
	Timestamp  time.Time      `json:"timestamp"`
}
