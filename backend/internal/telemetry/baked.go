package telemetry

// MeasurementID and APISecret are GA4 Measurement Protocol credentials
// baked into this binary at build time -- never read from the environment
// or a .env file, so an operator has nothing to configure for analytics to
// work (or not work). Set via ldflags:
//
//	go build -ldflags "-X github.com/postggresively/backend/internal/telemetry.MeasurementID=G-XXXXXXX \
//	                    -X github.com/postggresively/backend/internal/telemetry.APISecret=xxxxxxxx"
//
// .github/workflows/release.yml does this for every officially published
// build (from GitHub Actions repository variable GA_MEASUREMENT_ID and
// secret GA_API_SECRET), and docker/Dockerfile.backend does the same for
// the published Docker image (build args GA_MEASUREMENT_ID/GA_API_SECRET).
// A `go build` run any other way -- from source, `docker compose build`
// locally, a fork's own unconfigured CI -- leaves both empty, which keeps
// telemetry fully local: see Client.Configured and New.
//
// Only the marketing site's build (marketing/, a separate project) is
// deliberately untouched by any of this.
var (
	MeasurementID = ""
	APISecret     = ""
)
