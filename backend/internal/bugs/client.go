// Package bugs files GitHub Issues from the signed-in console.
//
// The GitHub token is baked into the binary at build time (see baked.go),
// never read from the environment, so official release builds can open
// issues on the upstream repo and self-built binaries stay inert.
package bugs

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"
	"strings"
	"sync"
	"time"
)

var (
	ErrNotConfigured = errors.New("bug reporting is not configured for this build")
	ErrInvalidTitle  = errors.New("title is required")
	ErrRateLimited   = errors.New("too many bug reports; try again later")
)

// DefaultRepo is the upstream Issues destination for official builds.
const DefaultRepo = "workvar/postgressively"

// Report is what the console operator fills in.
type Report struct {
	Title string
	Body  string
}

// Meta is non-secret diagnostics appended to the issue body.
type Meta struct {
	Version   string
	UserAgent string
	Path      string
}

// Issue is the created GitHub issue.
type Issue struct {
	URL    string
	Number int
	Title  string
}

// Client talks to the GitHub Issues API.
type Client struct {
	token   string
	repo    string // "owner/name"
	http    *http.Client
	apiBase string // overridable in tests; default https://api.github.com
	limit   *RateLimiter
}

// New builds a Client. An empty token keeps Configured() false and Create
// returns ErrNotConfigured. httpClient may be nil (uses http.DefaultClient).
func New(token, repo string, httpClient *http.Client) *Client {
	if httpClient == nil {
		httpClient = http.DefaultClient
	}
	if repo == "" {
		repo = DefaultRepo
	}
	return &Client{
		token:   strings.TrimSpace(token),
		repo:    strings.TrimSpace(repo),
		http:    httpClient,
		apiBase: "https://api.github.com",
		limit:   NewRateLimiter(5, time.Hour),
	}
}

// Configured reports whether this build can file issues upstream.
func (c *Client) Configured() bool {
	return c != nil && c.token != "" && c.repo != ""
}

// Allow checks the per-actor rate limit before Create. actor is typically
// the signed-in username.
func (c *Client) Allow(actor string) error {
	if c == nil || c.limit == nil {
		return nil
	}
	return c.limit.Allow(actor)
}

// FormatBody joins the operator's description with a diagnostics footer.
func FormatBody(description string, meta Meta) string {
	var b strings.Builder
	b.WriteString(strings.TrimSpace(description))
	if b.Len() > 0 {
		b.WriteString("\n\n")
	}
	b.WriteString("---\n")
	b.WriteString("_Submitted from Postggresively_\n\n")
	if meta.Version != "" {
		b.WriteString(fmt.Sprintf("- **Version:** `%s`\n", meta.Version))
	}
	if meta.Path != "" {
		b.WriteString(fmt.Sprintf("- **Path:** `%s`\n", meta.Path))
	}
	if meta.UserAgent != "" {
		b.WriteString(fmt.Sprintf("- **User-Agent:** `%s`\n", meta.UserAgent))
	}
	return b.String()
}

// Create opens a GitHub Issue labelled "bug".
func (c *Client) Create(ctx context.Context, report Report) (*Issue, error) {
	if !c.Configured() {
		return nil, ErrNotConfigured
	}
	title := strings.TrimSpace(report.Title)
	if title == "" {
		return nil, ErrInvalidTitle
	}

	payload := map[string]any{
		"title":  title,
		"body":   report.Body,
		"labels": []string{"bug"},
	}
	issue, err := c.postIssue(ctx, payload)
	if err != nil && strings.Contains(err.Error(), "label") {
		// Repo may not have a "bug" label yet — still file the issue.
		delete(payload, "labels")
		issue, err = c.postIssue(ctx, payload)
	}
	return issue, err
}

func (c *Client) postIssue(ctx context.Context, payload map[string]any) (*Issue, error) {
	raw, err := json.Marshal(payload)
	if err != nil {
		return nil, err
	}

	url := fmt.Sprintf("%s/repos/%s/issues", c.apiBase, c.repo)
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, url, bytes.NewReader(raw))
	if err != nil {
		return nil, err
	}
	req.Header.Set("Authorization", "Bearer "+c.token)
	req.Header.Set("Accept", "application/vnd.github+json")
	req.Header.Set("Content-Type", "application/json")
	req.Header.Set("X-GitHub-Api-Version", "2022-11-28")

	res, err := c.http.Do(req)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()
	body, _ := io.ReadAll(io.LimitReader(res.Body, 1<<20))

	if res.StatusCode < 200 || res.StatusCode >= 300 {
		return nil, fmt.Errorf("github issues api: %s: %s", res.Status, truncate(string(body), 200))
	}

	var out struct {
		HTMLURL string `json:"html_url"`
		Number  int    `json:"number"`
		Title   string `json:"title"`
	}
	if err := json.Unmarshal(body, &out); err != nil {
		return nil, err
	}
	return &Issue{URL: out.HTMLURL, Number: out.Number, Title: out.Title}, nil
}

func truncate(s string, n int) string {
	if len(s) <= n {
		return s
	}
	return s[:n] + "…"
}

// RateLimiter caps how many reports one actor can file in a window.
type RateLimiter struct {
	mu      sync.Mutex
	max     int
	window  time.Duration
	buckets map[string][]time.Time
	now     func() time.Time
}

// NewRateLimiter allows max successful Allow calls per actor per window.
func NewRateLimiter(max int, window time.Duration) *RateLimiter {
	return &RateLimiter{
		max:     max,
		window:  window,
		buckets: make(map[string][]time.Time),
		now:     time.Now,
	}
}

// Allow records a report for actor, or returns ErrRateLimited.
func (r *RateLimiter) Allow(actor string) error {
	if r == nil || r.max <= 0 {
		return nil
	}
	actor = strings.TrimSpace(actor)
	if actor == "" {
		actor = "anonymous"
	}

	r.mu.Lock()
	defer r.mu.Unlock()

	now := r.now()
	cutoff := now.Add(-r.window)
	kept := r.buckets[actor][:0]
	for _, t := range r.buckets[actor] {
		if t.After(cutoff) {
			kept = append(kept, t)
		}
	}
	if len(kept) >= r.max {
		r.buckets[actor] = kept
		return ErrRateLimited
	}
	r.buckets[actor] = append(kept, now)
	return nil
}
