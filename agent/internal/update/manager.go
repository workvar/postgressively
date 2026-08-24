package update

import (
	"context"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"runtime"
	"strings"
	"sync"
	"time"
)

// Kind values match PG_INSTALL_KIND / AGENT_INSTALL_KIND.
const (
	KindPM2    = "pm2"
	KindDocker = "docker"
)

// Status is a snapshot of the current (or last) update job.
type Status struct {
	Phase   string `json:"phase"`
	Message string `json:"message"`
	Error   string `json:"error,omitempty"`
	Done    bool   `json:"done"`
	Tag     string `json:"tag,omitempty"`
	Kind    string `json:"kind,omitempty"`
}

// Capabilities describes whether this agent can auto-apply.
type Capabilities struct {
	Kind          string `json:"kind"`
	CanAutoUpdate bool   `json:"canAutoUpdate"`
	Reason        string `json:"reason,omitempty"`
	Commands      string `json:"commands,omitempty"`
	InstallRoot   string `json:"installRoot,omitempty"`
}

// Config is the slice of agent config the updater needs.
type Config struct {
	Kind        string
	InstallRoot string
}

// Manager runs at most one update job.
type Manager struct {
	cfg Config

	mu     sync.Mutex
	status Status
	busy   bool
}

// New builds a Manager.
func New(cfg Config) *Manager {
	return &Manager{
		cfg:    cfg,
		status: Status{Phase: "idle", Message: "No update in progress.", Done: true},
	}
}

// Caps reports auto-update readiness for the configured install kind.
func (m *Manager) Caps() Capabilities {
	kind := strings.ToLower(strings.TrimSpace(m.cfg.Kind))
	root := strings.TrimSpace(m.cfg.InstallRoot)
	c := Capabilities{Kind: kind, InstallRoot: root}

	switch kind {
	case KindPM2:
		if root == "" {
			c.Reason = "AGENT_INSTALL_ROOT is not set"
			return c
		}
		if _, err := os.Stat(root); err != nil {
			c.Reason = "install root is not accessible"
			return c
		}
		c.CanAutoUpdate = true
		return c
	case KindDocker:
		c.Commands = DockerCommands(root, "VERSION")
		if root == "" {
			c.Reason = "AGENT_INSTALL_ROOT is not set"
			return c
		}
		if _, err := exec.LookPath("docker"); err != nil {
			c.Reason = "docker CLI not found in PATH"
			return c
		}
		if err := exec.Command("docker", "info").Run(); err != nil {
			c.Reason = "docker daemon not reachable (mount docker.sock to enable auto-update)"
			return c
		}
		c.CanAutoUpdate = true
		c.Commands = ""
		return c
	default:
		c.Reason = "unknown install kind (set AGENT_INSTALL_KIND to pm2 or docker)"
		return c
	}
}

// Snapshot returns the current job status.
func (m *Manager) Snapshot() Status {
	m.mu.Lock()
	defer m.mu.Unlock()
	return m.status
}

// Start begins an async apply. Returns an error if one is already running
// or the kind cannot auto-update.
func (m *Manager) Start(ctx context.Context, tag, kind string) error {
	tag = strings.TrimSpace(tag)
	if tag == "" {
		return fmt.Errorf("tag required")
	}
	if !strings.HasPrefix(tag, "v") {
		tag = "v" + tag
	}
	kind = strings.ToLower(strings.TrimSpace(kind))
	if kind == "" {
		kind = strings.ToLower(strings.TrimSpace(m.cfg.Kind))
	}

	caps := m.Caps()
	if !caps.CanAutoUpdate {
		if caps.Reason != "" {
			return fmt.Errorf("%s", caps.Reason)
		}
		return fmt.Errorf("auto-update is not available")
	}
	if kind != caps.Kind && caps.Kind != "" {
		return fmt.Errorf("install kind mismatch: agent is %s", caps.Kind)
	}

	m.mu.Lock()
	if m.busy {
		m.mu.Unlock()
		return fmt.Errorf("an update is already in progress")
	}
	m.busy = true
	m.status = Status{Phase: "starting", Message: "Starting update…", Tag: tag, Kind: kind, Done: false}
	m.mu.Unlock()

	go m.run(tag, kind)
	return nil
}

func (m *Manager) run(tag, kind string) {
	defer func() {
		m.mu.Lock()
		m.busy = false
		m.mu.Unlock()
	}()

	var err error
	switch kind {
	case KindPM2:
		err = m.applyPM2(tag)
	case KindDocker:
		err = m.applyDocker(tag)
	default:
		err = fmt.Errorf("unsupported kind %q", kind)
	}

	m.mu.Lock()
	defer m.mu.Unlock()
	if err != nil {
		m.status.Phase = "error"
		m.status.Error = err.Error()
		m.status.Message = "Update failed."
		m.status.Done = true
		return
	}
	m.status.Phase = "done"
	m.status.Message = "Update complete. Services are restarting."
	m.status.Done = true
}

func (m *Manager) set(phase, message string) {
	m.mu.Lock()
	defer m.mu.Unlock()
	m.status.Phase = phase
	m.status.Message = message
	m.status.Error = ""
}

func (m *Manager) applyPM2(tag string) error {
	root := m.cfg.InstallRoot
	asset, err := PlatformAsset(tag, runtime.GOOS, runtime.GOARCH, os.Getenv("GOARM"))
	if err != nil {
		return err
	}
	url := DownloadURL(tag, asset)

	m.set("downloading", "Downloading "+asset+"…")
	staging, err := os.MkdirTemp(root, ".update-*")
	if err != nil {
		// fall back to system temp then copy — still confined extracts into root
		staging, err = os.MkdirTemp("", "postggresively-update-*")
		if err != nil {
			return err
		}
	}
	defer os.RemoveAll(staging)

	archive := filepath.Join(staging, asset)
	if err := downloadFile(url, archive); err != nil {
		return fmt.Errorf("download: %w", err)
	}

	m.set("applying", "Extracting release…")
	extractDir := filepath.Join(staging, "extracted")
	if err := os.MkdirAll(extractDir, 0o755); err != nil {
		return err
	}
	if err := extractArchive(archive, extractDir); err != nil {
		return fmt.Errorf("extract: %w", err)
	}

	bundle, err := findBundleRoot(extractDir)
	if err != nil {
		return err
	}

	m.set("applying", "Replacing binaries and web…")
	if err := replaceDir(filepath.Join(bundle, "bin"), filepath.Join(root, "bin")); err != nil {
		return fmt.Errorf("replace bin: %w", err)
	}
	if err := replaceDir(filepath.Join(bundle, "web"), filepath.Join(root, "web")); err != nil {
		return fmt.Errorf("replace web: %w", err)
	}
	// Refresh helper scripts when present.
	for _, name := range []string{"build-web.mjs", "ecosystem.config.js", "package.json"} {
		src := filepath.Join(bundle, name)
		dst := filepath.Join(root, name)
		if _, err := os.Stat(src); err == nil {
			_ = copyFile(src, dst)
		}
	}

	m.set("applying", "Building web UI…")
	if err := runIn(root, "npm", "run", "setup"); err != nil {
		return fmt.Errorf("npm run setup: %w", err)
	}

	m.set("restarting", "Restarting PM2 processes…")
	if err := runIn(root, "npx", "pm2", "restart", "ecosystem.config.js"); err != nil {
		// try npm run restart
		if err2 := runIn(root, "npm", "run", "restart"); err2 != nil {
			return fmt.Errorf("pm2 restart: %v / %v", err, err2)
		}
	}
	return nil
}

func (m *Manager) applyDocker(tag string) error {
	root := m.cfg.InstallRoot
	m.set("applying", "Pulling images for "+tag+"…")
	env := append(os.Environ(), "POSTGGRESSIVELY_VERSION="+tag)
	if err := runInEnv(root, env, "docker", "compose", "pull"); err != nil {
		return fmt.Errorf("docker compose pull: %w", err)
	}
	m.set("restarting", "Recreating containers…")
	if err := runInEnv(root, env, "docker", "compose", "up", "-d"); err != nil {
		return fmt.Errorf("docker compose up: %w", err)
	}
	return nil
}

func runIn(dir string, name string, args ...string) error {
	return runInEnv(dir, nil, name, args...)
}

func runInEnv(dir string, env []string, name string, args ...string) error {
	ctx, cancel := context.WithTimeout(context.Background(), 30*time.Minute)
	defer cancel()
	cmd := exec.CommandContext(ctx, name, args...)
	cmd.Dir = dir
	if env != nil {
		cmd.Env = env
	}
	out, err := cmd.CombinedOutput()
	if err != nil {
		msg := strings.TrimSpace(string(out))
		if msg == "" {
			return err
		}
		if len(msg) > 400 {
			msg = msg[len(msg)-400:]
		}
		return fmt.Errorf("%w: %s", err, msg)
	}
	return nil
}

func findBundleRoot(extractDir string) (string, error) {
	// Archives contain a single top-level postggresively-TAG-PLATFORM/ folder.
	entries, err := os.ReadDir(extractDir)
	if err != nil {
		return "", err
	}
	for _, e := range entries {
		if e.IsDir() && strings.HasPrefix(e.Name(), "postggresively-") {
			p := filepath.Join(extractDir, e.Name())
			if _, err := os.Stat(filepath.Join(p, "bin")); err == nil {
				return p, nil
			}
		}
	}
	if _, err := os.Stat(filepath.Join(extractDir, "bin")); err == nil {
		return extractDir, nil
	}
	return "", fmt.Errorf("could not find bundle root in archive")
}
