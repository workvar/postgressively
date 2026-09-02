import type { UpdateJobStatus } from "@/lib/updates";

export const UPDATE_STEPS = [
  "Starting",
  "Downloading",
  "Applying",
  "Restarting",
  "Done",
] as const;

const PHASE_STEP: Record<string, number> = {
  idle: 0,
  starting: 0,
  downloading: 1,
  applying: 2,
  restarting: 3,
  done: 4,
  error: -1,
};

export function stepIndexForPhase(phase: string | undefined): number {
  if (!phase) return 0;
  const idx = PHASE_STEP[phase];
  return idx === undefined ? 0 : idx;
}

/** Full-screen wait while services bounce or the console goes offline mid-update. */
export function shouldShowWaitingOverlay(
  job: UpdateJobStatus | null,
  pollFailures: number,
): boolean {
  if (!job || job.phase === "error") return false;
  if (job.phase === "restarting" || job.phase === "done") return true;
  return pollFailures >= 2;
}

export const UPDATE_ACTIVE_KEY = "pg:update-active";

export function readActiveUpdateTag(): string {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(UPDATE_ACTIVE_KEY) ?? "";
}

export function markUpdateActive(tag: string) {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.setItem(UPDATE_ACTIVE_KEY, tag);
}

export function clearUpdateActive() {
  if (typeof sessionStorage === "undefined") return;
  sessionStorage.removeItem(UPDATE_ACTIVE_KEY);
}
