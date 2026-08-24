package telemetry

// Settings controls what this installation reports. It is edited from the
// web UI's Account page (GET/POST /api/telemetry) and persisted locally
// (store.go) rather than in the operator's Postgres, so it survives even
// with no database reachable.
//
//   - ProductAnalytics gates the anonymous GA4 events this backend emits:
//     feature usage, connection/backup outcomes, startup, error categories.
//     Never included: hostnames, database/schema/table names, credentials,
//     SQL text, query parameters, or row data.
//   - UIAnalytics gates Microsoft Clarity in the browser (web/), which
//     records clicks and navigation to find confusing screens. It only ever
//     runs in the product UI, never on the separate marketing site.
//
// Enabled is the master switch: off stops both regardless of the two
// settings above, and stops the local queue from accepting new events.
type Settings struct {
	Enabled          bool `json:"enabled"`
	ProductAnalytics bool `json:"productAnalytics"`
	UIAnalytics      bool `json:"uiAnalytics"`
}

// defaultSettings matches the analytics guide's "practical initial
// configuration": telemetry on, both channels on. Every switch here can be
// turned off from the Account page at any time.
func defaultSettings() Settings {
	return Settings{Enabled: true, ProductAnalytics: true, UIAnalytics: true}
}
