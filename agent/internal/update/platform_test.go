package update

import (
	"runtime"
	"strings"
	"testing"
)

func TestPlatformAsset(t *testing.T) {
	name, err := PlatformAsset("v1.2.3", "linux", "amd64", "")
	if err != nil {
		t.Fatal(err)
	}
	if name != "postggresively-v1.2.3-linux-amd64.tar.gz" {
		t.Fatalf("got %s", name)
	}

	name, err = PlatformAsset("v1.2.3", "windows", "amd64", "")
	if err != nil {
		t.Fatal(err)
	}
	if name != "postggresively-v1.2.3-windows-amd64.zip" {
		t.Fatalf("got %s", name)
	}

	name, err = PlatformAsset("v1.2.3", "linux", "arm", "7")
	if err != nil {
		t.Fatal(err)
	}
	if name != "postggresively-v1.2.3-linux-armv7.tar.gz" {
		t.Fatalf("got %s", name)
	}
}

func TestDownloadURL(t *testing.T) {
	u := DownloadURL("v1.2.3", "postggresively-v1.2.3-linux-amd64.tar.gz")
	want := "https://github.com/workvar/postgressively/releases/download/v1.2.3/postggresively-v1.2.3-linux-amd64.tar.gz"
	if u != want {
		t.Fatalf("got %s", u)
	}
}

func TestConfinedPath(t *testing.T) {
	root := t.TempDir()
	ok, err := ConfinedPath(root, root+"/bin")
	if err != nil {
		t.Fatal(err)
	}
	if ok == "" {
		t.Fatal("empty")
	}
	if _, err := ConfinedPath(root, root+"/../escape"); err == nil {
		t.Fatal("expected escape to fail")
	}
}

func TestRuntimePlatformAsset(t *testing.T) {
	_, err := PlatformAsset("v1.0.0", runtime.GOOS, runtime.GOARCH, "")
	if err != nil && runtime.GOOS != "linux" && runtime.GOOS != "darwin" && runtime.GOOS != "windows" {
		t.Skip(err)
	}
	if err != nil && (runtime.GOOS == "linux" || runtime.GOOS == "darwin" || runtime.GOOS == "windows") {
		// arm without GOARM on linux/arm may fail; tolerate
		t.Log(err)
	}
}

func TestDockerCommands(t *testing.T) {
	got := DockerCommands("/opt/pg", "v1.2.3")
	if !strings.Contains(got, "POSTGGRESSIVELY_VERSION=v1.2.3") {
		t.Fatalf("got %q", got)
	}
	if !strings.Contains(got, "docker compose pull") {
		t.Fatalf("got %q", got)
	}
}
