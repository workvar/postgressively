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

	a, err := c.Latest(t.Context(), false)
	if err != nil {
		t.Fatal(err)
	}
	b, err := c.Latest(t.Context(), false)
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

func TestCheckerLatestForceBypassesCache(t *testing.T) {
	hits := 0
	srv := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		hits++
		tag := "v1.4.0"
		if hits > 1 {
			tag = "v1.4.1"
		}
		_ = json.NewEncoder(w).Encode(map[string]any{
			"tag_name":     tag,
			"html_url":     "https://github.com/workvar/postgressively/releases/tag/" + tag,
			"body":         "notes",
			"published_at": "2026-08-01T00:00:00Z",
		})
	}))
	defer srv.Close()

	c := updates.NewChecker(srv.Client(), time.Hour)
	c.SetAPIBase(srv.URL)

	first, err := c.Latest(t.Context(), false)
	if err != nil {
		t.Fatal(err)
	}
	if first.Tag != "v1.4.0" {
		t.Fatalf("first tag %s", first.Tag)
	}

	cached, err := c.Latest(t.Context(), false)
	if err != nil {
		t.Fatal(err)
	}
	if hits != 1 {
		t.Fatalf("expected cache hit, got %d fetches", hits)
	}
	if cached.Tag != "v1.4.0" {
		t.Fatalf("cached tag %s", cached.Tag)
	}

	fresh, err := c.Latest(t.Context(), true)
	if err != nil {
		t.Fatal(err)
	}
	if hits != 2 {
		t.Fatalf("expected forced refetch, got %d fetches", hits)
	}
	if fresh.Tag != "v1.4.1" {
		t.Fatalf("forced tag %s", fresh.Tag)
	}
}
