package bugs

import (
	"encoding/json"
	"io"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"
	"time"
)

func TestConfigured(t *testing.T) {
	if New("", "owner/repo", nil).Configured() {
		t.Fatal("empty token must not be configured")
	}
	if !New("ghp_x", "owner/repo", nil).Configured() {
		t.Fatal("non-empty token must be configured")
	}
}

func TestFormatBodyAppendsDiagnostics(t *testing.T) {
	got := FormatBody("Something broke", Meta{
		Version: "v1.2.3",
		UserAgent: "Mozilla/5.0",
		Path: "/tables",
	})
	if !strings.Contains(got, "Something broke") {
		t.Fatalf("missing description: %q", got)
	}
	for _, want := range []string{"v1.2.3", "Mozilla/5.0", "/tables"} {
		if !strings.Contains(got, want) {
			t.Fatalf("missing %q in:\n%s", want, got)
		}
	}
}

func TestCreatePostsGitHubIssue(t *testing.T) {
	var gotMethod, gotPath, gotAuth, gotAccept string
	var gotBody map[string]any

	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		gotMethod = r.Method
		gotPath = r.URL.Path
		gotAuth = r.Header.Get("Authorization")
		gotAccept = r.Header.Get("Accept")
		raw, _ := io.ReadAll(r.Body)
		_ = json.Unmarshal(raw, &gotBody)
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusCreated)
		_, _ = w.Write([]byte(`{"html_url":"https://github.com/workvar/postgressively/issues/42","number":42,"title":"Crash on save"}`))
	}))
	defer srv.Close()

	c := New("ghp_test", "workvar/postgressively", srv.Client())
	c.apiBase = srv.URL

	issue, err := c.Create(t.Context(), Report{
		Title: "Crash on save",
		Body:  "steps…",
	})
	if err != nil {
		t.Fatalf("create: %v", err)
	}
	if gotMethod != http.MethodPost {
		t.Fatalf("method %s", gotMethod)
	}
	if gotPath != "/repos/workvar/postgressively/issues" {
		t.Fatalf("path %s", gotPath)
	}
	if gotAuth != "Bearer ghp_test" {
		t.Fatalf("auth %q", gotAuth)
	}
	if gotAccept != "application/vnd.github+json" {
		t.Fatalf("accept %q", gotAccept)
	}
	if gotBody["title"] != "Crash on save" {
		t.Fatalf("title %#v", gotBody["title"])
	}
	labels, _ := gotBody["labels"].([]any)
	if len(labels) != 1 || labels[0] != "bug" {
		t.Fatalf("labels %#v", gotBody["labels"])
	}
	if issue.URL != "https://github.com/workvar/postgressively/issues/42" || issue.Number != 42 {
		t.Fatalf("issue %#v", issue)
	}
}

func TestCreateRequiresConfiguration(t *testing.T) {
	_, err := New("", "owner/repo", nil).Create(t.Context(), Report{Title: "x", Body: "y"})
	if err != ErrNotConfigured {
		t.Fatalf("got %v, want ErrNotConfigured", err)
	}
}

func TestCreateValidatesTitle(t *testing.T) {
	c := New("tok", "o/r", nil)
	_, err := c.Create(t.Context(), Report{Title: "  ", Body: "body"})
	if err != ErrInvalidTitle {
		t.Fatalf("got %v, want ErrInvalidTitle", err)
	}
}

func TestRateLimitAllowsThenBlocks(t *testing.T) {
	lim := NewRateLimiter(2, time.Hour)
	if err := lim.Allow("alice"); err != nil {
		t.Fatalf("1st: %v", err)
	}
	if err := lim.Allow("alice"); err != nil {
		t.Fatalf("2nd: %v", err)
	}
	if err := lim.Allow("alice"); err != ErrRateLimited {
		t.Fatalf("3rd: got %v, want ErrRateLimited", err)
	}
	if err := lim.Allow("bob"); err != nil {
		t.Fatalf("other user blocked: %v", err)
	}
}
