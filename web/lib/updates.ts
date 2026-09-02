import { api } from "@/lib/api";

export type UpdateInfo = {
  current: string;
  latest?: string;
  available: boolean;
  kind: string;
  canAutoUpdate: boolean;
  reason?: string;
  notes?: string;
  htmlUrl?: string;
  commands?: string;
  checkError?: string;
};

export type UpdateJobStatus = {
  phase: string;
  message: string;
  error?: string;
  done: boolean;
  tag?: string;
  kind?: string;
};

const DISMISS_KEY = "pg:update-dismissed";

export function getUpdateInfo(opts?: { refresh?: boolean }) {
  const q = opts?.refresh ? "?refresh=1" : "";
  return api.get<UpdateInfo>(`/api/updates${q}`);
}

export function applyUpdate(tag?: string) {
  return api.post<UpdateJobStatus>("/api/updates/apply", tag ? { tag } : {}, {
    reason: "Confirm to download and apply this release. Services will restart briefly.",
  });
}

export function getUpdateJobStatus() {
  return api.get<UpdateJobStatus>("/api/updates/status");
}

export function dismissedUpdateTag(): string {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(DISMISS_KEY) ?? "";
}

export function dismissUpdate(tag: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(DISMISS_KEY, tag);
}
