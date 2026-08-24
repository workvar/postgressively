package bugs

// Token is a GitHub fine-grained (or classic) personal access token with
// permission to create issues on DefaultRepo. It is baked into this binary
// at build time -- never read from the environment or a .env file -- so an
// operator has nothing to configure for bug reporting to work (or not).
// Set via ldflags:
//
//	go build -ldflags "-X github.com/postggresively/backend/internal/bugs.Token=ghp_…"
//
// .github/workflows/release.yml does this for every officially published
// build (from GitHub Actions secret GH_BUG_TOKEN), and
// docker/Dockerfile.backend does the same for the published Docker image
// (build arg GH_BUG_TOKEN). A `go build` run any other way leaves Token
// empty, which keeps Create returning ErrNotConfigured.
var Token = ""
