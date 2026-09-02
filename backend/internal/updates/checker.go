// Package updates checks GitHub Releases for newer Postggresively builds.
package updates

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"
)

const (
	DefaultRepo = "workvar/postgressively"
	apiLatest   = "https://api.github.com"
)

// Release is a trimmed GitHub Releases "latest" payload.
type Release struct {
	Tag     string
	HTMLURL string
	Notes   string
	PublishedAt time.Time
}

// Checker fetches and caches the latest release.
type Checker struct {
	http    *http.Client
	apiBase string
	repo    string
	ttl     time.Duration

	mu    sync.Mutex
	cached *Release
	cachedAt time.Time
}

func NewChecker(httpClient *http.Client, ttl time.Duration) *Checker {
	if httpClient == nil {
		httpClient = &http.Client{Timeout: 15 * time.Second}
	}
	if ttl <= 0 {
		ttl = time.Hour
	}
	return &Checker{http: httpClient, apiBase: apiLatest, repo: DefaultRepo, ttl: ttl}
}

// SetAPIBase overrides the GitHub API root (tests).
func (c *Checker) SetAPIBase(base string) { c.apiBase = base }

// Latest returns the cached or freshly fetched latest release.
// When force is true, the cache is bypassed and GitHub is queried again.
func (c *Checker) Latest(ctx context.Context, force bool) (*Release, error) {
	c.mu.Lock()
	defer c.mu.Unlock()
	if !force && c.cached != nil && time.Since(c.cachedAt) < c.ttl {
		cp := *c.cached
		return &cp, nil
	}
	rel, err := c.fetch(ctx)
	if err != nil {
		return nil, err
	}
	c.cached = rel
	c.cachedAt = time.Now()
	cp := *rel
	return &cp, nil
}

func (c *Checker) fetch(ctx context.Context) (*Release, error) {
	url := fmt.Sprintf("%s/repos/%s/releases/latest", c.apiBase, c.repo)
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	if err != nil {
		return nil, err
	}
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	res, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))
	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, fmt.Errorf("github releases: %s: %s", res.Status, truncate(string(body), 160))
	}
	var raw struct {
		TagName     string `json:"tag_name"`
		HTMLURL     string `json:"html_url"`
		Body        string `json:"body"`
		PublishedAt string `json:"published_at"`
	}
	if err := json.Unmarshal(body, &raw); err != nil {
		return nil, err
	}
	if raw.TagName == "" {
		return nil, fmt.Errorf("github releases: empty tag")
	}
	pub, _ := time.Parse(time.RFC3339, raw.PublishedAt)
	return &Release{
		Tag:         NormalizeTag(raw.TagName),
		HTMLURL:     raw.HTMLURL,
		Notes:       raw.Body,
		PublishedAt: pub,
	}, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}
