// Package telemetry is Postggresively's opt-out analytics client: anonymous
// product usage to GA4, plus the local queue and settings that back it.
//
// It follows the boundaries in the analytics guide: an anonymous, random
// installation id (never a hostname or anything else identifying); no
// database names, credentials, SQL text, query parameters or row data in any
// event; and analytics is never on the critical path of a request. Track
// writes to a local SQLite queue and returns immediately -- a background
// goroutine does the actual delivery, on its own schedule, with retries.
//
// Microsoft Clarity (the browser-side UI analytics channel) is not part of
// this package: it runs entirely client-side in web/, gated by the same
// UIAnalytics setting this package stores. See web/lib/telemetry.ts.
package telemetry

import (
	"encoding/json"
	"log"
	"sync"
	"time"

	"github.com/google/uuid"
)

// Client is the backend's one entry point into analytics: local install
// identity, the operator's telemetry preferences, and a non-blocking way to
// record an event.
//
// A Client is always safe to use, even if its local queue could not be
// opened or no GA4 credentials are configured: Track and the settings
// getters/setters degrade to no-ops rather than blocking startup or a
// request. Analytics must never be the reason Postggresively won't start.
// See New.
type Client struct {
	store          *store
	measurementID  string
	apiSecret      string
	appVersion     string
	installationID string
	http           httpDoer

	mu       sync.RWMutex
	settings Settings

	events    chan []byte // encoded storedEvent payloads, drained by runWriter
	done      chan struct{}
	closeOnce sync.Once
	wg        sync.WaitGroup
}

// eventQueueDepth bounds how many events can be waiting for the local writer
// goroutine before Track starts dropping them. Generous for a console used
// by one operator; dropping (rather than blocking) is what keeps Track from
// ever slowing down the request that triggered it.
const eventQueueDepth = 256

// New opens (or creates) the local telemetry store under dataDir and starts
// the background writer and sender. measurementID/apiSecret are the GA4
// Measurement Protocol credentials baked into this binary at build time
// (MeasurementID/APISecret in baked.go -- callers pass those, not anything
// read from the environment); leave both empty to keep analytics fully
// local -- Track still records into the local queue's settings, but the
// sender loop never makes a network call.
//
// New never fails the caller: if the store can't be opened (bad
// permissions, no disk space) it's logged and the returned Client silently
// no-ops everywhere, rather than stopping the backend from booting.
func New(dataDir, measurementID, apiSecret, appVersion string) *Client {
	c := &Client{
		measurementID: measurementID,
		apiSecret:     apiSecret,
		appVersion:    appVersion,
		http:          newHTTPClient(),
		settings:      defaultSettings(),
		events:        make(chan []byte, eventQueueDepth),
		done:          make(chan struct{}),
	}

	st, err := openStore(dataDir)
	if err != nil {
		log.Printf("telemetry: local queue unavailable, analytics disabled: %v", err)
		return c
	}
	c.store = st

	if id, ok, err := st.getKV("installation_id"); err == nil && ok {
		c.installationID = id
	} else {
		id := uuid.Must(uuid.NewV7()).String()
		if err := st.setKV("installation_id", id); err != nil {
			log.Printf("telemetry: could not persist installation id: %v", err)
		}
		c.installationID = id
	}

	var s Settings
	if ok, err := st.getJSON("settings", &s); err == nil && ok {
		c.settings = s
	} else if err := st.setJSON("settings", c.settings); err != nil {
		log.Printf("telemetry: could not persist default settings: %v", err)
	}

	c.wg.Add(2)
	go c.runWriter()
	go c.runSender()
	return c
}

// InstallationID is the stable, anonymous identifier sent as GA4's
// client_id. Empty when the local store could not be opened.
func (c *Client) InstallationID() string { return c.installationID }

// Configured reports whether this binary was built with GA4 credentials
// baked in (see MeasurementID/APISecret in baked.go). The web UI uses this
// to explain a "product analytics" toggle that would otherwise look like it
// does nothing on a build that has nowhere to send events regardless.
func (c *Client) Configured() bool { return c.measurementID != "" && c.apiSecret != "" }

// GetSettings returns the operator's current telemetry preferences.
func (c *Client) GetSettings() Settings {
	c.mu.RLock()
	defer c.mu.RUnlock()
	return c.settings
}

// SetSettings persists new preferences and applies them immediately: a
// disabled Client stops queuing new events right away. Anything already
// queued stays on disk until re-enabled (or the file is removed by hand).
func (c *Client) SetSettings(s Settings) error {
	c.mu.Lock()
	c.settings = s
	c.mu.Unlock()

	if c.store == nil {
		return nil
	}
	return c.store.setJSON("settings", s)
}

// Track records one anonymous event: feature usage, a connection or backup
// outcome, a startup, an error category. It never blocks and never returns
// an error -- there's nothing a caller could usefully do with either. See
// the package doc for what must never appear in properties.
func (c *Client) Track(name string, properties map[string]any) {
	if c.store == nil {
		return
	}
	settings := c.GetSettings()
	if !settings.Enabled || !settings.ProductAnalytics {
		return
	}
	if c.measurementID == "" || c.apiSecret == "" {
		return // nothing configured to receive this event
	}

	props := make(map[string]any, len(properties)+1)
	for k, v := range properties {
		props[k] = v
	}
	props["app_version"] = c.appVersion

	payload, err := json.Marshal(storedEvent{Name: name, Properties: props, Timestamp: time.Now().UTC()})
	if err != nil {
		log.Printf("telemetry: encode %s event: %v", name, err)
		return
	}

	select {
	case c.events <- payload:
	default:
		log.Printf("telemetry: queue full, dropping %s event", name)
	}
}

// TrackInstallation fires "installation" exactly once per install (recorded
// in the local store, not the operator's database, so it survives even a
// wiped console database) and "service_started" on every boot after that.
func (c *Client) TrackInstallation(os, arch string) {
	if c.store == nil {
		return
	}
	if _, seen, err := c.store.getKV("installation_seen"); err == nil && !seen {
		c.Track("installation", map[string]any{"os": os, "arch": arch})
		if err := c.store.setKV("installation_seen", "1"); err != nil {
			log.Printf("telemetry: could not record installation as seen: %v", err)
		}
	}
	c.Track("service_started", nil)
}

// runWriter drains Track's channel into SQLite. It's the only goroutine
// that writes to the queue table, so Track itself never touches disk.
func (c *Client) runWriter() {
	defer c.wg.Done()
	for {
		select {
		case payload := <-c.events:
			if err := c.store.enqueue(payload); err != nil {
				log.Printf("telemetry: queue event: %v", err)
			}
		case <-c.done:
			c.drainWriterQueue()
			return
		}
	}
}

// drainWriterQueue flushes anything already buffered in the channel before
// the writer exits, so a shutdown right after a burst of events doesn't
// silently lose them.
func (c *Client) drainWriterQueue() {
	for {
		select {
		case payload := <-c.events:
			if err := c.store.enqueue(payload); err != nil {
				log.Printf("telemetry: queue event: %v", err)
			}
		default:
			return
		}
	}
}

// Close stops the background goroutines and closes the local store. Queued,
// unsent events stay on disk and are picked up again on next boot. Safe to
// call more than once.
func (c *Client) Close() {
	if c.store == nil {
		return
	}
	c.closeOnce.Do(func() {
		close(c.done)
		c.wg.Wait()
		if err := c.store.close(); err != nil {
			log.Printf("telemetry: close queue: %v", err)
		}
	})
}
