"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { ErrorNote } from "@/components/ui/Panel";
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

  const refresh = useCallback(() => {
    getUpdateInfo()
      .then(setInfo)
      .catch((e) => setError(e instanceof Error ? e.message : "could not check for updates"));
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    if (!busy) return;
    const id = window.setInterval(() => {
      getUpdateJobStatus()
        .then((status) => {
          setJob(status);
          if (status.done) {
            setBusy(false);
            if (status.phase === "done") {
              window.setTimeout(() => window.location.reload(), 2500);
            }
          }
        })
        .catch(() => {});
    }, 1500);
    return () => window.clearInterval(id);
  }, [busy]);

  async function onApply() {
    setError(null);
    setBusy(true);
    setJob({ phase: "starting", message: "Starting update…", done: false });
    try {
      const status = await applyUpdate(info?.latest);
      setJob(status);
      if (status.done) setBusy(false);
    } catch (e) {
      setBusy(false);
      setError(e instanceof Error ? e.message : "could not start update");
    }
  }

  if (error && !info) return <ErrorNote>{error}</ErrorNote>;
  if (!info) return <p className="text-small text-fg-muted">Checking for updates…</p>;

  return (
    <div className="space-y-4 max-w-[640px]">
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

      {info.checkError && <ErrorNote>{info.checkError}</ErrorNote>}

      {!info.available && !info.checkError && (
        <p className="text-small text-fg-muted">You are on the latest release.</p>
      )}

      {info.available && (
        <div className="space-y-3">
          {info.notes && (
            <pre className="max-h-48 overflow-auto rounded-lg border border-line bg-surface-2 p-3 text-caption text-fg-muted whitespace-pre-wrap">
              {info.notes}
            </pre>
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

          {info.canAutoUpdate ? (
            <Button type="button" size="md" disabled={busy} onClick={onApply}>
              {busy ? "Updating…" : `Update to ${info.latest}`}
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
        </div>
      )}

      {job && (
        <p className="text-small text-fg-muted">
          {job.message}
          {job.error ? ` — ${job.error}` : ""}
        </p>
      )}

      {error && <ErrorNote>{error}</ErrorNote>}

      <Button type="button" variant="secondary" size="sm" onClick={refresh} disabled={busy}>
        Check again
      </Button>
    </div>
  );
}
