"use client";

import { useEffect } from "react";
import { loadClarity } from "@/lib/clarity";
import { clarityProjectId, getTelemetrySettings } from "@/lib/telemetry";

/**
 * Loads Microsoft Clarity for the whole product UI (web/) -- never the
 * separate marketing site, which this component isn't part of. Two
 * independent gates both have to pass:
 *
 *   1. A Clarity project id is baked into this build
 *      (NEXT_PUBLIC_CLARITY_PROJECT_ID; see scripts/build-web.mjs).
 *   2. The operator has both telemetry and UI analytics turned on
 *      (GET /api/telemetry -- editable from Account > Privacy & telemetry).
 *
 * Rendered once from the root layout, so it covers every page including
 * /login and /setup. If either gate fails, or the settings request itself
 * fails, nothing loads: analytics is never required for the console to work.
 */
export default function ClarityScript() {
  useEffect(() => {
    const id = clarityProjectId();
    if (!id) return;

    let cancelled = false;
    getTelemetrySettings()
      .then((settings) => {
        if (!cancelled && settings.enabled && settings.uiAnalytics) {
          loadClarity(id);
        }
      })
      .catch(() => {
        // Analytics must never be the reason the console fails to load.
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return null;
}
