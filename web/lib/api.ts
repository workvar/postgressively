import { withConnection } from "./activeConnection";
import { clearToken, getToken } from "./auth";
import { elevationToken, requestElevation } from "./elevate";

const BASE = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export class ApiError extends Error {}

type Options = {
  /** Surface a 401 to the caller instead of bouncing to /login. */
  keep401?: boolean;
  /** Human-readable reason shown in the step-up dialog. */
  reason?: string;
  /** Internal: set once a request has already been retried after step-up. */
  retried?: boolean;
};

function headersFor(init: RequestInit) {
  const token = getToken();
  const elevated = elevationToken();
  return {
    "Content-Type": "application/json",
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(elevated ? { "X-Elevated-Token": elevated } : {}),
    ...(init.headers ?? {}),
  };
}

async function request<T>(path: string, init: RequestInit = {}, opts: Options = {}): Promise<T> {
  // Browsing endpoints are scoped to the selected connection; everything else
  // (accounts, the agent, the connection list itself) is left alone.
  const res = await fetch(`${BASE}${withConnection(path)}`, { ...init, headers: headersFor(init) });

  if (res.status === 401 && !opts.keep401) {
    clearToken();
    if (typeof window !== "undefined") window.location.href = "/login";
    throw new ApiError("unauthorized");
  }

  const body = await res.json().catch(() => ({}));

  // The backend asks for a fresh confirmation rather than failing outright.
  if (res.status === 403 && body?.needsStepUp && !opts.retried) {
    const token = await requestElevation(opts.reason ?? "This action needs confirmation.");
    if (token) {
      return request<T>(path, init, { ...opts, retried: true });
    }
    throw new ApiError("confirmation cancelled");
  }

  if (!res.ok) throw new ApiError(body?.error ?? `request failed (${res.status})`);
  return body as T;
}

const json = (body?: unknown) => (body === undefined ? undefined : JSON.stringify(body));

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown, opts?: Options) =>
    request<T>(path, { method: "POST", body: json(body) }, opts),
  patch: <T>(path: string, body?: unknown, opts?: Options) =>
    request<T>(path, { method: "PATCH", body: json(body) }, opts),
  del: <T>(path: string, opts?: Options) => request<T>(path, { method: "DELETE" }, opts),
};

/**
 * Same transport as `api`, but a 401 is surfaced to the caller instead of
 * bouncing to /login. Use it where the form itself explains the failure,
 * such as a wrong current password.
 */
export const apiSafe = {
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: json(body) }, { keep401: true }),
};

export async function login(username: string, password: string) {
  const res = await fetch(`${BASE}/api/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(body?.error ?? "login failed");
  return body as { token: string; username: string; expiresAt: string };
}

/** Unauthenticated POST, used by the passkey sign-in ceremony. */
export async function publicPost<T>(path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: json(body),
  });
  const parsed = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError((parsed as { error?: string })?.error ?? "request failed");
  return parsed as T;
}
