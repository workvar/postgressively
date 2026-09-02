"use client";

import { UPDATE_STEPS, stepIndexForPhase } from "@/lib/update-progress";
import type { UpdateJobStatus } from "@/lib/updates";

export default function UpdateProgress({
  job,
  target,
}: {
  job: UpdateJobStatus;
  target?: string;
}) {
  const failed = job.phase === "error";
  const active = failed ? inferFailedStep(job) : stepIndexForPhase(job.phase);
  const pct = failed ? 100 : Math.min(100, ((active + (job.done ? 1 : 0.45)) / UPDATE_STEPS.length) * 100);

  return (
    <div
      className="w-full rounded-xl border border-accent/20 bg-accent-soft/40 p-4"
      role="status"
      aria-live="polite"
      aria-busy={!job.done && !failed}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-small font-semibold text-fg">
            {failed ? "Update failed" : job.done ? "Update complete" : "Update in progress"}
          </p>
          {target && <p className="mt-0.5 font-mono text-caption text-fg-muted">{target}</p>}
        </div>
        {!failed && !job.done && (
          <span className="mt-0.5 h-2 w-2 shrink-0 rounded-full bg-accent animate-pulseDot" aria-hidden />
        )}
      </div>

      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-line">
        <div
          className={`h-full rounded-full transition-[width] duration-500 ease-apple ${
            failed
              ? "bg-danger"
              : "bg-[linear-gradient(90deg,var(--accent)_0%,#3aa89f_45%,var(--accent)_90%)] bg-[length:200%_100%]"
          } ${!failed && !job.done ? "animate-progressShimmer" : ""}`}
          style={{ width: `${Math.max(8, pct)}%` }}
        />
      </div>

      <ol className="mt-4 space-y-2.5">
        {UPDATE_STEPS.map((label, i) => {
          const done = !failed && (job.done || i < active);
          const isActive = !job.done && i === active;
          return (
            <li key={label} className="flex items-start gap-2.5">
              <span
                className={`mt-0.5 grid h-5 w-5 shrink-0 place-items-center rounded-full border text-micro font-semibold ${
                  failed && isActive
                    ? "border-danger bg-danger text-white"
                    : done
                      ? "border-accent bg-accent text-white"
                      : isActive
                        ? "border-accent text-accent"
                        : "border-line-strong text-fg-subtle"
                }`}
                aria-hidden
              >
                {done ? "✓" : failed && isActive ? "!" : i + 1}
              </span>
              <div className="min-w-0">
                <p
                  className={`text-small ${
                    isActive ? "font-semibold text-fg" : done ? "text-fg-muted" : "text-fg-subtle"
                  }`}
                >
                  {label}
                </p>
                {isActive && job.message && (
                  <p className="mt-0.5 text-caption text-fg-muted">{job.message}</p>
                )}
                {failed && isActive && job.error && (
                  <p className="mt-0.5 text-caption text-danger">{job.error}</p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}

function inferFailedStep(job: UpdateJobStatus): number {
  const msg = `${job.message} ${job.error ?? ""}`.toLowerCase();
  if (msg.includes("download")) return 1;
  if (msg.includes("restart") || msg.includes("pm2") || msg.includes("compose")) return 3;
  if (msg.includes("extract") || msg.includes("replace") || msg.includes("npm") || msg.includes("pull")) return 2;
  return 2;
}
