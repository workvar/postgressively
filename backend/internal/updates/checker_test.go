package updates_test

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/postggresively/backend/internal/updates"
)

func TestCheckerLatestCaches(t *testing.T) {
	hits := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits++
		if r.URL.Path != "/repos/workvar/postgressively/releases/latest" {
			t.Fatalf("path %s", r.URL.Path)
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"tag_name":   "v1.4.0",
			"html_url":   "https://github.com/workvar/postgressively/releases/tag/v1.4.0",
			"body":       "Fixes and polish.",
			"published_at": "2026-08-01T00:00:00Z",
		})
	}))
	defer srv.Close()

	c := updates.NewChecker(srv.Client(), time.Hour)
	c.SetAPIBase(srv.URL)

	a, err := c.Latest(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	b, err := c.Latest(t.Context())
	if err != nil {
		t.Fatal(err)
	}
	if hits != 1 {
		t.Fatalf("expected 1 fetch, got %d", hits)
	}
	if a.Tag != "v1.4.0" || b.Tag != "v1.4.0" {
		t.Fatalf("got %#v %#v", a, b)
	}
	if a.HTMLURL == "" || a.Notes == "" {
		t.Fatalf("missing fields %#v", a)
	}
}
