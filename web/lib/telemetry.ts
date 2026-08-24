import { api } from "@/lib/api";
import type { TelemetrySettings } from "@/lib/types";

/**
 * The operator's telemetry preferences (GET/POST /api/telemetry). The
 * backend route is public, so this loads on /login and /setup too, before
 * a session exists -- that's what lets components/analytics/ClarityScript
 * decide whether to load Clarity before sign-in.
 */
export function getTelemetrySettings() {
  return api.get<TelemetrySettings>("/api/telemetry");
}

export function updateTelemetrySettings(next: Omit<TelemetrySettings, "configured">) {
  return api.post<TelemetrySettings>("/api/telemetry", next);
}

/** The GA4-analogue on the browser side: Clarity's project id, inlined into
 * the bundle at build time the same way NEXT_PUBLIC_API_URL is (see
 * scripts/build-web.mjs). Empty means this build has no Clarity project to
 * load, regardless of the uiAnalytics preference. */
export function clarityProjectId(): string {
  return process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID ?? "";
}
