"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import CopyRow from "@/components/ui/CopyRow";
import Panel from "@/components/ui/Panel";
import { api } from "@/lib/api";
import { bytes } from "@/lib/format";
import type { DatabaseDetail, Extension } from "@/lib/types";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0">
      <span className="w-40 shrink-0 text-small text-fg-muted">{label}</span>
      <span className="min-w-0 flex-1 text-small text-fg">{value}</span>
    </div>
  );
}

export default function DatabaseDrawer({
  db,
  host,
  port,
  onDropped,
}: {
  db: DatabaseDetail;
  host: string;
  port: number;
  onDropped: () => void;
}) {
  const [extensions, setExtensions] = useState<Extension[] | null>(null);
  const [extError, setExtError] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [dropError, setDropError] = useState<string | null>(null);

  useEffect(() => {
    setExtensions(null);
    setExtError(null);
    api
      .get<Extension[]>(`/api/databases/${encodeURIComponent(db.name)}/extensions`)
      .then(setExtensions)
      .catch((e) => setExtError(e.message));
  }, [db.name]);

  const uri = `postgresql://${db.owner}:PASSWORD@${host}:${port}/${db.name}`;

  async function drop() {
    setBusy(true);
    setDropError(null);
    try {
      await api.del(`/api/databases/${encodeURIComponent(db.name)}`, {
        reason: `Dropping ${db.name} deletes all of its data.`,
      });
      onDropped();
    } catch (e) {
      setDropError(e instanceof Error ? e.message : "drop failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-4">
      <Panel title={db.name} description="Database settings" tint padded={false}>
        <Row label="Owner" value={db.owner} />
        <Row label="Size" value={bytes(db.sizeBytes)} />
        <Row label="Encoding" value={db.encoding} />
        <Row label="Collation" value={`${db.collate} / ${db.ctype}`} />
        <Row
          label="Connection limit"
          value={db.connectionLimit === -1 ? "unlimited" : String(db.connectionLimit)}
        />
        <Row label="Active connections" value={String(db.activeConnections)} />
        <Row
          label="Accepts connections"
          value={
            db.allowConnections ? <Badge tone="success">yes</Badge> : <Badge tone="danger">no</Badge>
          }
        />
      </Panel>

      <Panel title="Extensions" tint padded={false}>
        {extError && <p className="px-4 py-3 text-small text-danger">{extError}</p>}
        {!extensions && !extError && (
          <p className="px-4 py-3 text-small text-fg-subtle">Loading…</p>
        )}
        {extensions && extensions.length === 0 && (
          <p className="px-4 py-3 text-small text-fg-subtle">No extensions installed.</p>
        )}
        {extensions && extensions.length > 0 && (
          <div className="flex flex-wrap gap-1.5 p-4">
            {extensions.map((e) => (
              <Badge key={e.name} tone="accent">
                {e.name} {e.version}
              </Badge>
            ))}
          </div>
        )}
      </Panel>

      <Panel title="Connect" tint padded={false}>
        <CopyRow label="Service URI" value={uri} secret />
        <CopyRow label="Host" value={host} />
        <CopyRow label="Port" value={String(port)} />
        <CopyRow label="Database" value={db.name} />
        <CopyRow label="User" value={db.owner} />
      </Panel>

      {!db.isCurrent && (
        <Panel title="Danger zone" tint>
          <p className="text-small text-fg-muted">
            Dropping <span className="font-mono">{db.name}</span> deletes all of its data and
            disconnects active sessions. Type the database name to confirm.
          </p>
          {dropError && <p className="mt-2 text-small text-danger">{dropError}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <input
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder={db.name}
              className="h-9 rounded-lg border border-line bg-surface px-3 font-mono text-caption focus:border-danger focus:outline-none"
            />
            <Button variant="danger" size="sm" disabled={confirm !== db.name || busy} onClick={drop}>
              {busy ? "Dropping…" : "Drop database"}
            </Button>
          </div>
        </Panel>
      )}
    </div>
  );
}
