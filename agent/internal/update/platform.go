package update

import (
	"fmt"
	"path/filepath"
	"strings"
)

const (
	GitHubOwner = "workvar"
	GitHubRepo  = "postgressively"
	GHCROwner   = "workvar"
)

// PlatformAsset names the release archive for a GOOS/GOARCH(/GOARM) triple.
func PlatformAsset(tag, goos, goarch, goarm string) (string, error) {
	tag = strings.TrimSpace(tag)
	if tag == "" {
		return "", fmt.Errorf("tag required")
	}
	if !strings.HasPrefix(tag, "v") {
		tag = "v" + tag
	}
	var plat string
	switch goos {
	case "darwin":
		switch goarch {
		case "amd64":
			plat = "darwin-amd64"
		case "arm64":
			plat = "darwin-arm64"
		default:
			return "", fmt.Errorf("unsupported darwin arch %s", goarch)
		}
		return fmt.Sprintf("postggresively-%s-%s.tar.gz", tag, plat), nil
	case "linux":
		switch goarch {
		case "amd64":
			plat = "linux-amd64"
		case "arm64":
			plat = "linux-arm64"
		case "arm":
			if goarm == "7" || goarm == "" {
				plat = "linux-armv7"
			} else {
				return "", fmt.Errorf("unsupported linux arm GOARM=%s", goarm)
			}
		default:
			return "", fmt.Errorf("unsupported linux arch %s", goarch)
		}
		return fmt.Sprintf("postggresively-%s-%s.tar.gz", tag, plat), nil
	case "windows":
		if goarch != "amd64" {
			return "", fmt.Errorf("unsupported windows arch %s", goarch)
		}
		return fmt.Sprintf("postggresively-%s-windows-amd64.zip", tag), nil
	default:
		return "", fmt.Errorf("unsupported OS %s", goos)
	}
}

// DownloadURL is the canonical GitHub release asset URL.
func DownloadURL(tag, asset string) string {
	return fmt.Sprintf("https://github.com/%s/%s/releases/download/%s/%s", GitHubOwner, GitHubRepo, tag, asset)
}

// ConfinedPath resolves target under root; rejects path escape.
func ConfinedPath(root, target string) (string, error) {
	absRoot, err := filepath.Abs(root)
	if err != nil {
		return "", err
	}
	absTarget, err := filepath.Abs(target)
	if err != nil {
		return "", err
	}
	sep := string(filepath.Separator)
	if absTarget != absRoot && !strings.HasPrefix(absTarget, absRoot+sep) {
		return "", fmt.Errorf("path %q escapes install root", target)
	}
	return absTarget, nil
}

// DockerCommands are shown when auto-update cannot run.
func DockerCommands(installRoot, tag string) string {
	if !strings.HasPrefix(tag, "v") {
		tag = "v" + tag
	}
	root := installRoot
	if root == "" {
		root = "."
	}
	return strings.TrimSpace(fmt.Sprintf(`
cd %s
export POSTGGRESSIVELY_VERSION=%s
docker compose pull
docker compose up -d
`, root, tag)) + "\n"
}

// ImageRef returns a GHCR image reference for a service.
func ImageRef(service, tag string) string {
	if !strings.HasPrefix(tag, "v") && tag != "latest" {
		tag = "v" + tag
	}
	return fmt.Sprintf("ghcr.io/%s/postggresively-%s:%s", GHCROwner, service, tag)
}
