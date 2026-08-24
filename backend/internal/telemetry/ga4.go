package telemetry

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"net/url"
	"time"
)

// measurementProtocolURL is Google's fixed GA4 Measurement Protocol
// endpoint. measurementID and apiSecret (query params) identify which
// property and data stream events belong to.
const measurementProtocolURL = "https://www.google-analytics.com/mp/collect"

// httpDoer is the one method Client needs from *http.Client, so tests can
// substitute a fake transport without a real network call.
type httpDoer interface {
	Do(req *http.Request) (*http.Response, error)
}

func newHTTPClient() httpDoer {
	return &http.Client{Timeout: 10 * time.Second}
}

// mpEvent and mpPayload are GA4 Measurement Protocol's own wire format:
// https://developers.google.com/analytics/devguides/collection/protocol/ga4
type mpEvent struct {
	Name   string         `json:"name"`
	Params map[string]any `json:"params"`
}

type mpPayload struct {
	ClientID           string    `json:"client_id"`
	NonPersonalizedAds bool      `json:"non_personalized_ads"`
	Events             []mpEvent `json:"events"`
}

// sendBatch delivers up to 25 events (GA4's own per-request limit; see
// batchSize in sender.go) in one HTTPS call. GA4 does not report per-event
// success or failure for Measurement Protocol, so any non-2xx response is
// treated as a whole-batch failure and retried later by the caller.
func sendBatch(ctx context.Context, client httpDoer, measurementID, apiSecret, clientID string, events []storedEvent) error {
	payload := mpPayload{ClientID: clientID, NonPersonalizedAds: true}
	for _, e := range events {
		params := make(map[string]any, len(e.Properties))
		for k, v := range e.Properties {
			params[k] = v
		}
		payload.Events = append(payload.Events, mpEvent{Name: e.Name, Params: params})
	}

	body, err := json.Marshal(payload)
	if err != nil {
		return fmt.Errorf("encode batch: %w", err)
	}

	q := url.Values{"measurement_id": {measurementID}, "api_secret": {apiSecret}}
	req, err := http.NewRequestWithContext(ctx, http.MethodPost, measurementProtocolURL+"?"+q.Encode(), bytes.NewReader(body))
	if err != nil {
		return err
	}
	req.Header.Set("Content-Type", "application/json")

	resp, err := client.Do(req)
	if err != nil {
		return fmt.Errorf("send: %w", err)
	}
	defer resp.Body.Close()
	if resp.StatusCode < 200 || resp.StatusCode >= 300 {
		return fmt.Errorf("ga4 responded %d", resp.StatusCode)
	}
	return nil
}
