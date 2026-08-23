package agentclient

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"time"
)

// Client talks to the Postggresively agent running next to Postgres.
type Client struct {
	BaseURL string
	Token   string
	HTTP    *http.Client
}

func New(baseURL, token string) *Client {
	return &Client{
		BaseURL: baseURL,
		Token:   token,
		HTTP:    &http.Client{Timeout: 60 * time.Second},
	}
}

func (c *Client) do(ctx context.Context, method, path string, body any, out any) error {
	var rdr io.Reader
	if body != nil {
		b, err := json.Marshal(body)
		if err != nil {
			return err
		}
		rdr = bytes.NewReader(b)
	}
	req, err := http.NewRequestWithContext(ctx, method, c.BaseURL+path, rdr)
	if err != nil {
		return err
	}
	req.Header.Set("Authorization", "Bearer "+c.Token)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTP.Do(req)
	if err != nil {
		return fmt.Errorf("agent unreachable: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode >= 300 {
		b, _ := io.ReadAll(resp.Body)
		return fmt.Errorf("agent error %d: %s", resp.StatusCode, string(b))
	}
	if out == nil {
		return nil
	}
	return json.NewDecoder(resp.Body).Decode(out)
}

func (c *Client) Status(ctx context.Context) (map[string]any, error) {
	var out map[string]any
	return out, c.do(ctx, http.MethodGet, "/v1/status", nil, &out)
}

// Discover lists database engines the agent found on its host.
func (c *Client) Discover(ctx context.Context) (map[string]any, error) {
	var out map[string]any
	return out, c.do(ctx, http.MethodGet, "/v1/discover", nil, &out)
}

func (c *Client) Stats(ctx context.Context) (map[string]any, error) {
	var out map[string]any
	return out, c.do(ctx, http.MethodGet, "/v1/stats", nil, &out)
}

func (c *Client) Service(ctx context.Context, action string) (map[string]any, error) {
	var out map[string]any
	return out, c.do(ctx, http.MethodPost, "/v1/service/"+action, nil, &out)
}

func (c *Client) Backup(ctx context.Context, database string) (map[string]any, error) {
	var out map[string]any
	return out, c.do(ctx, http.MethodPost, "/v1/backups", map[string]string{"database": database}, &out)
}

func (c *Client) Backups(ctx context.Context) (map[string]any, error) {
	var out map[string]any
	return out, c.do(ctx, http.MethodGet, "/v1/backups", nil, &out)
}

func (c *Client) Logs(ctx context.Context, lines int) (map[string]any, error) {
	var out map[string]any
	return out, c.do(ctx, http.MethodGet, fmt.Sprintf("/v1/logs?lines=%d", lines), nil, &out)
}
