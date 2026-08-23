/**
 * Which database the data pages are pointed at.
 *
 * The backend scopes every browsing endpoint with `?conn=<id>`, where "local"
 * means the Postgres instance the console was installed next to. Rather than
 * thread that through every call site, `lib/api.ts` asks this module to
 * decorate the paths that are connection-scoped.
 */

export const LOCAL_CONNECTION = "local";

const STORAGE_KEY = "postggresively.connection";

/** Paths whose data depends on which connection is selected. */
const SCOPED = ["/api/databases", "/api/tables", "/api/query", "/api/completions"];

let current = LOCAL_CONNECTION;
const listeners = new Set<(id: string) => void>();

// Restore the selection before the first render so a refresh stays put.
if (typeof window !== "undefined") {
  try {
    current = window.localStorage.getItem(STORAGE_KEY) ?? LOCAL_CONNECTION;
  } catch {
    current = LOCAL_CONNECTION;
  }
}

export function activeConnection(): string {
  return current;
}

export function setActiveConnection(id: string) {
  if (id === current) return;
  current = id || LOCAL_CONNECTION;
  try {
    window.localStorage.setItem(STORAGE_KEY, current);
  } catch {
    // A private window without storage still works for this session.
  }
  listeners.forEach((fn) => fn(current));
}

export function onConnectionChange(fn: (id: string) => void): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

/** Appends ?conn= to the endpoints that are scoped by connection. */
export function withConnection(path: string): string {
  if (current === LOCAL_CONNECTION) return path;
  if (!SCOPED.some((p) => path === p || path.startsWith(`${p}/`) || path.startsWith(`${p}?`))) {
    return path;
  }
  return `${path}${path.includes("?") ? "&" : "?"}conn=${encodeURIComponent(current)}`;
}
