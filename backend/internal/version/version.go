// Package version holds the build-time application version.
//
// It is reported as the app_version property on every telemetry event (see
// internal/telemetry) and is available for anything else that wants to show
// what's running, such as an about panel.
package version

// Version is overridden at build time via:
//
//	go build -ldflags "-X github.com/postggresively/backend/internal/version.Version=v1.2.3"
//
// No build script sets this yet -- scripts/deploy.sh, scripts/ci/ and the
// PM2/Docker release paths all build a plain `go build` today -- so released
// binaries report "dev" until that ldflags line is added there.
var Version = "dev"
