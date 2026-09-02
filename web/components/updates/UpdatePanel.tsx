"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { ErrorNote } from "@/components/ui/Panel";
import UpdateProgress from "@/components/updates/UpdateProgress";
import UpdateWaitingOverlay from "@/components/updates/UpdateWaitingOverlay";
import {
  clearUpdateActive,
  markUpdateActive,
  readActiveUpdateTag,
  shouldShowWaitingOverlay,
} from "@/lib/update-progress";
import {
  applyUpdate,
  getUpdateInfo,
  getUpdateJobStatus,
  type UpdateInfo,
  type UpdateJobStatus,
} from "@/lib/updates";

export default function UpdatePanel() {
  const [info, setInfo] = useState<UpdateInfo | null>(null);
  const [job, setJob] = useState<UpdateJobStatus | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [pollFailures, setPollFailures] = useState(0);

  const refresh = useCallback((force = false) => {
    getUpdateInfo(force ? { refresh: true } : undefined)
      .then((next) => {
        setInfo(next);
        if (!busy) setError(null);
      })
      .catch((e) => {
        if (!busy) setError(e instanceof Error ? e.message : "could not check for updates");
      });
  }, [busy]);

  useEffect(() => {
    refresh(false);
  }, [refresh]);

  // Resume progress UI if the tab reloaded mid-update.
  useEffect(() => {
    const tag = readActiveUpdateTag();
    if (!tag) return;
    setBusy(true);
    setJob({ phase: "applying", message: "Reconnecting to update…", done: false, tag });
  }, []);

  useEffect(() => {
    if (!busy) return;

    let cancelled = false;
    const tick = () => {
      getUpdateJobStatus()
        .then((status) => {
          if (cancelled) return;
          setPollFailures(0);
          setJob(status);
          setError(null);

          if (status.done) {
            if (status.phase === "error") {
              clearUpdateActive();
              setBusy(false);
              return;
            }
            // Services are bouncing — keep the waiting overlay and reload when reachable.
            window.setTimeout(() => {
              if (!cancelled) window.location.reload();
            }, 2000);
          }
        })
        .catch(() => {
          if (cancelled) return;
          setPollFailures((n) => n + 1);
        });
    };

    tick();
    const id = window.setInterval(tick, 1200);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [busy]);

  // After restart, keep probing until the API answers, then reload.
  useEffect(() => {
    if (!busy || !shouldShowWaitingOverlay(job, pollFailures)) return;

    let cancelled = false;
    const id = window.setInterval(() => {
      getUpdateJobStatus()
        .then(() => {
          if (cancelled) return;
          clearUpdateActive();
          window.location.reload();
        })
        .catch(() => {});
    }, 2000);

    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [busy, job, pollFailures]);

  async function onApply() {
    setError(null);
    const tag = info?.latest ?? "";
    markUpdateActive(tag || "pending");
    setBusy(true);
    setPollFailures(0);
    setJob({ phase: "starting", message: "Starting update…", done: false, tag });
    try {
      const status = await applyUpdate(tag || undefined);
      setJob(status);
      if (status.done && status.phase === "error") {
        clearUpdateActive();
        setBusy(false);
      }
    } catch (e) {
      // The agent may already be running the job; keep polling instead of
      // treating a transport blip as a hard failure.
      setJob((prev) => prev ?? { phase: "starting", message: "Starting update…", done: false, tag });
      const msg = e instanceof Error ? e.message : "could not start update";
      if (msg === "confirmation cancelled") {
        clearUpdateActive();
        setBusy(false);
        setJob(null);
        setError(msg);
      }
      // Otherwise stay busy; the next status poll clarifies success vs failure.
    }
  }

  const waiting = busy && shouldShowWaitingOverlay(job, pollFailures);

  if (error && !info && !busy) return <ErrorNote>{error}</ErrorNote>;
  if (!info && !busy) return <p className="text-small text-fg-muted">Checking for updates…</p>;

  return (
    <div className="space-y-4 max-w-[640px]">
      {waiting && (
        <UpdateWaitingOverlay
          message={
            pollFailures >= 2
              ? "The console went offline while applying the update. Waiting for it to come back…"
              : job?.message
          }
        />
      )}

      {info && (
        <dl className="grid gap-3 sm:grid-cols-2 text-small">
          <div>
            <dt className="text-caption text-fg-subtle">Current</dt>
            <dd className="mt-0.5 font-medium text-fg font-mono">{info.current}</dd>
          </div>
          <div>
            <dt className="text-caption text-fg-subtle">Latest</dt>
            <dd className="mt-0.5 font-medium text-fg font-mono">{info.latest ?? "—"}</dd>
          </div>
          <div>
            <dt className="text-caption text-fg-subtle">Install</dt>
            <dd className="mt-0.5 text-fg">{info.kind || "unknown"}</dd>
          </div>
        </dl>
      )}

      {info?.checkError && !busy && <ErrorNote>{info.checkError}</ErrorNote>}

      {job && busy && <UpdateProgress job={job} target={job.tag || info?.latest} />}

      {!busy && info && !info.available && !info.checkError && (
        <p className="text-small text-fg-muted">You are on the latest release.</p>
      )}

      {!busy && info?.available && (
        <div className="flex flex-col items-start gap-3">
          {info.notes && (
            <pre className="max-h-48 w-full overflow-auto rounded-lg border border-line bg-surface-2 p-3 text-caption text-fg-muted whitespace-pre-wrap">
              {info.notes}
            </pre>
          )}

          {info.canAutoUpdate ? (
            <Button type="button" size="md" onClick={onApply}>
              Update to {info.latest}
            </Button>
          ) : (
            <div className="space-y-2">
              {info.reason && <p className="text-small text-fg-muted">{info.reason}</p>}
              {info.commands && (
                <pre className="overflow-auto rounded-lg border border-line bg-surface-2 p-3 text-caption font-mono text-fg">
                  {info.commands}
                </pre>
              )}
            </div>
          )}

          {info.htmlUrl && (
            <a
              href={info.htmlUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="text-small text-accent hover:underline"
            >
              Release notes on GitHub
            </a>
          )}
        </div>
      )}

      {job && !busy && job.phase === "error" && (
        <UpdateProgress job={job} target={job.tag || info?.latest} />
      )}

      {error && !busy && <ErrorNote>{error}</ErrorNote>}

      {!busy && (
        <Button type="button" variant="secondary" size="sm" onClick={() => refresh(true)}>
          Check again
        </Button>
      )}
    </div>
  );
}
