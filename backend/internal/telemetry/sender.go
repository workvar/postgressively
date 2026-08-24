package telemetry

import (
	"context"
	"encoding/json"
	"log"
	"time"
)

// batchSize matches GA4 Measurement Protocol's own limit of 25 events per
// request, so one poll of the queue always fits in a single call.
const batchSize = 25

// pollInterval is how often the sender checks for new events under normal
// conditions. It doesn't need to be fast: nothing in the product waits on
// analytics, so a few minutes of delivery lag is invisible to the operator.
const pollInterval = 30 * time.Second

const (
	minBackoff = 30 * time.Second
	maxBackoff = 10 * time.Minute
)

// runSender periodically flushes the local queue to GA4. It is the only
// goroutine that makes network calls on Postggresively's behalf for
// telemetry, and a failure here only ever grows the backoff before the next
// attempt -- it never surfaces to the rest of the application, and it never
// blocks a request.
func (c *Client) runSender() {
	defer c.wg.Done()

	if c.measurementID == "" || c.apiSecret == "" {
		<-c.done // nothing configured to send to; just wait for shutdown
		return
	}

	backoff := minBackoff
	timer := time.NewTimer(0) // check once at startup, in case events survived a restart
	defer timer.Stop()

	for {
		select {
		case <-c.done:
			return
		case <-timer.C:
			sent, err := c.flushOnce()
			switch {
			case err != nil:
				log.Printf("telemetry: send failed, retrying in %s: %v", backoff, err)
				timer.Reset(backoff)
				backoff = min(backoff*2, maxBackoff)
			case sent >= batchSize:
				// More may be waiting; check again shortly instead of
				// waiting out the full poll interval.
				backoff = minBackoff
				timer.Reset(time.Second)
			default:
				backoff = minBackoff
				timer.Reset(pollInterval)
			}
		}
	}
}

// flushOnce sends at most one batch and reports how many events it removed
// from the queue (sent, or dropped as unreadable).
func (c *Client) flushOnce() (int, error) {
	settings := c.GetSettings()
	if !settings.Enabled || !settings.ProductAnalytics {
		return 0, nil // leave the queue as-is; a re-enable picks up where it left off
	}

	pending, err := c.store.pending(batchSize)
	if err != nil {
		return 0, err
	}
	if len(pending) == 0 {
		return 0, nil
	}

	events := make([]storedEvent, 0, len(pending))
	ids := make([]int64, 0, len(pending))
	for _, p := range pending {
		var e storedEvent
		if err := json.Unmarshal(p.payload, &e); err != nil {
			// A row that can never be parsed would otherwise wedge the
			// queue forever; drop it and keep going.
			log.Printf("telemetry: dropping unreadable queued event: %v", err)
			ids = append(ids, p.id)
			continue
		}
		events = append(events, e)
		ids = append(ids, p.id)
	}

	if len(events) > 0 {
		ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
		defer cancel()
		if err := sendBatch(ctx, c.http, c.measurementID, c.apiSecret, c.installationID, events); err != nil {
			return 0, err
		}
	}

	if err := c.store.delete(ids); err != nil {
		return 0, err
	}
	return len(pending), nil
}
