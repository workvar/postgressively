"use client";

import { useEffect, useState } from "react";
import { Toggle } from "@/components/ui/Field";
import { ErrorNote } from "@/components/ui/Panel";
import { clarityProjectId, getTelemetrySettings, updateTelemetrySettings } from "@/lib/telemetry";
import type { TelemetrySettings } from "@/lib/types";

/**
 * The Account page's telemetry controls. Three independent switches, all
 * off by turning off "Enabled":
 *
 *   - Product analytics: anonymous GA4 events from the backend (feature
 *     usage, connection/backup outcomes, errors). Never a hostname,
 *     database name, credential, SQL statement or row of data.
 *   - UI analytics: Microsoft Clarity in this browser tab, recording
 *     clicks and navigation. Sensitive fields (connection strings, query
 *     text, row data) are masked before Clarity ever sees them.
 *
 * See internal/telemetry's package doc and web/lib/telemetry.ts for the
 * full boundary these draw.
 */
export default function TelemetryForm() {
  const [settings, setSettings] = useState<TelemetrySettings | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    getTelemetrySettings()
      .then(setSettings)
      .catch((e) => setError(e instanceof Error ? e.message : "could not load telemetry settings"));
  }, []);

  async function save(next: TelemetrySettings) {
    setSettings(next); // optimistic: toggles should feel instant
    setSaving(true);
    setError(null);
    try {
      const saved = await updateTelemetrySettings(next);
      setSettings(saved);
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not save telemetry settings");
    } finally {
      setSaving(false);
    }
  }

  if (error && !settings) return <ErrorNote>{error}</ErrorNote>;
  if (!settings) return null;

  const hasClarity = clarityProjectId() !== "";

  return (
    <div className="space-y-3">
      <Toggle
        label="Send anonymous usage data"
        hint="Feature usage, connection and backup outcomes, and error categories. Never database names, credentials, SQL text or row data."
        checked={settings.enabled}
        onChange={(enabled) => save({ ...settings, enabled })}
      />
      <div className={settings.enabled ? "" : "pointer-events-none opacity-50"}>
        <div className="grid gap-3 sm:grid-cols-2">
          <Toggle
            label="Product analytics"
            hint={
              settings.configured
                ? "Anonymous events reported over HTTPS, queued locally first."
                : "This build has no analytics destination configured, so this has no effect either way."
            }
            checked={settings.productAnalytics}
            onChange={(productAnalytics) => save({ ...settings, productAnalytics })}
          />
          <Toggle
            label="UI analytics (Microsoft Clarity)"
            hint={
              hasClarity
                ? "Clicks and navigation in this browser tab, to find confusing screens. Sensitive fields are masked."
                : "This build has no Clarity project configured, so this has no effect either way."
            }
            checked={settings.uiAnalytics}
            onChange={(uiAnalytics) => save({ ...settings, uiAnalytics })}
          />
        </div>
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}
      {saving && <p className="text-caption text-fg-subtle">Saving…</p>}
    </div>
  );
}
