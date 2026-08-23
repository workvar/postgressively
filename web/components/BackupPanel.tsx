"use client";

import { useCallback, useEffect, useState } from "react";
import Button from "./ui/Button";
import Panel, { EmptyState, ErrorNote } from "./ui/Panel";
import Combobox from "./ui/Combobox";
import { api } from "@/lib/api";
import { bytes } from "@/lib/format";
import type { Database } from "@/lib/types";

type Backup = { file: string; database: string; sizeBytes: number; createdAt: string };

export default function BackupPanel() {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [target, setTarget] = useState("");
  const [backups, setBackups] = useState<Backup[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadBackups = useCallback(() => {
    api
      .get<{ backups: Backup[] }>("/api/agent/backups")
      .then((r) => setBackups(r.backups ?? []))
      .catch(() => setBackups([]));
  }, []);

  useEffect(() => {
    api.get<Database[]>("/api/databases").then((d) => {
      setDatabases(d);
      if (d.length) setTarget(d[0].name);
    });
    loadBackups();
  }, [loadBackups]);

  async function create() {
    setBusy(true);
    setError(null);
    try {
      await api.post("/api/agent/backups", { database: target });
      loadBackups();
    } catch (e) {
      setError(e instanceof Error ? e.message : "backup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Panel
      title="Backups"
      description="Point-in-time dumps stored on the server."
      padded={false}
      action={
        <div className="flex items-center gap-2">
          <Combobox
            aria-label="Database to back up"
            options={databases.map((d) => ({
              value: d.name,
              label: d.name,
              hint: bytes(d.sizeBytes),
            }))}
            value={target}
            onChange={setTarget}
            placeholder="Search databases…"
            emptyText="No databases match"
            className="w-[200px]"
          />
          <Button size="sm" onClick={create} disabled={busy || !target}>
            {busy ? "Dumping…" : "Create backup"}
          </Button>
        </div>
      }
    >
      {error && (
        <div className="px-5 pt-5">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      <ul className="divide-y divide-line">
        {backups.map((b) => (
          <li
            key={b.file}
            className="flex items-center justify-between gap-4 px-5 py-3.5 transition-colors duration-150 ease-apple hover:bg-surface-hover"
          >
            <span className="truncate font-mono text-[13px]">{b.file}</span>
            <span className="shrink-0 text-[13px] text-fg-muted">
              {bytes(b.sizeBytes)} · {new Date(b.createdAt).toLocaleString()}
            </span>
          </li>
        ))}
        {backups.length === 0 && <EmptyState>No backups yet.</EmptyState>}
      </ul>
    </Panel>
  );
}
