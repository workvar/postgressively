"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import type { DraftDatabase } from "@/lib/wizard";
import type { AgentStatus } from "@/lib/types";

function Item({ label, value }: { label: string; value: string }) {
  return (
    <div className="border-b border-line py-2.5 last:border-0">
      <div className="text-caption text-fg-subtle">{label}</div>
      <div className="mt-0.5 truncate text-small font-medium text-fg">{value}</div>
    </div>
  );
}

/** Aiven-style sticky summary rail with the primary create action. */
export default function SummaryRail({
  draft,
  status,
  canCreate,
  busy,
  onCreate,
}: {
  draft: DraftDatabase;
  status: AgentStatus | null;
  canCreate: boolean;
  busy: boolean;
  onCreate: () => void;
}) {
  return (
    <aside className="sticky top-20 h-fit rounded-xl border border-line bg-surface p-4 shadow-card">
      <h2 className="text-subtitle text-fg">Summary</h2>
      <p className="mt-0.5 text-caption text-fg-muted">Created on this server</p>

      <div className="mt-3">
        <Item label="Name" value={draft.name || "not set"} />
        <Item label="Template" value={draft.template} />
        <Item label="Encoding" value={`${draft.encoding} · ${draft.locale}`} />
        <Item label="Owner" value={draft.owner} />
        <Item label="Host" value={`${status?.host ?? "localhost"}:${status?.port ?? 5432}`} />
        <Item label="Pooling" value={draft.pooling ? draft.poolMode : "disabled"} />
      </div>

      {draft.extensions.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {draft.extensions.map((e) => (
            <Badge key={e} tone="accent">
              {e}
            </Badge>
          ))}
        </div>
      )}

      <Button
        variant="brand"
        size="md"
        className="mt-4 w-full"
        disabled={!canCreate || busy}
        onClick={onCreate}
      >
        {busy ? "Creating…" : "Create database"}
      </Button>
      <p className="mt-2 text-center text-caption text-fg-subtle">
        No data is written until you confirm.
      </p>
    </aside>
  );
}
