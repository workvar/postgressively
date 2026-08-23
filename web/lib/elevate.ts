/**
 * Step-up authentication state.
 *
 * Critical actions (dropping a database, deleting rows, removing a passkey)
 * need a short-lived "elevated" token on top of the session token. The token
 * lives in memory only: it is never persisted, so closing the tab drops it.
 *
 * `lib/api.ts` attaches the token to every request and, when the backend says
 * an action needs confirmation, calls `requestElevation` to raise the prompt
 * the UI registered with `setElevationPrompt`.
 */

type Elevation = { token: string; expiresAt: number };

/** Asks the user to confirm, resolving with a fresh token or null if cancelled. */
export type ElevationPrompt = (reason: string) => Promise<string | null>;

/** Seconds of headroom so a token cannot expire in flight. */
const SKEW_MS = 5_000;

let current: Elevation | null = null;
let prompt: ElevationPrompt | null = null;
let pending: Promise<string | null> | null = null;

export function setElevationPrompt(fn: ElevationPrompt | null) {
  prompt = fn;
}

export function storeElevation(token: string, expiresAt: string) {
  current = { token, expiresAt: new Date(expiresAt).getTime() };
}

export function clearElevation() {
  current = null;
}

/** The current token, or null when there is none or it has expired. */
export function elevationToken(): string | null {
  if (!current) return null;
  if (Date.now() + SKEW_MS >= current.expiresAt) {
    current = null;
    return null;
  }
  return current.token;
}

/**
 * Returns a usable token, prompting the user when none is held. Concurrent
 * callers share one prompt so a batch of requests raises a single dialog.
 */
export async function requestElevation(reason: string): Promise<string | null> {
  const held = elevationToken();
  if (held) return held;
  if (!prompt) return null;

  if (!pending) {
    pending = prompt(reason).finally(() => {
      pending = null;
    });
  }
  return pending;
}
