"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";

/** Action bar above the grid: add, delete, copy, then review and save. */
export default function GridToolbar({
  pending,
  editable,
  hasSelection,
  busy,
  onAdd,
  onDelete,
  onCopy,
  onReview,
  onDiscard,
}: {
  pending: { inserts: number; updates: number; deletes: number; total: number };
  editable: boolean;
  hasSelection: boolean;
  busy: boolean;
  onAdd: () => void;
  onDelete: () => void;
  onCopy: () => void;
  onReview: () => void;
  onDiscard: () => void;
}) {
  return (
    <div className="mb-2.5 flex flex-wrap items-center gap-2">
      <Button variant="secondary" size="xs" onClick={onCopy}>
        Copy
      </Button>
      <Button variant="secondary" size="xs" onClick={onAdd} disabled={!editable}>
        Add row
      </Button>
      <Button variant="danger" size="xs" onClick={onDelete} disabled={!editable || !hasSelection}>
        Delete row
      </Button>

      <span className="flex-1" />

      {pending.total > 0 && (
        <>
          {pending.inserts > 0 && <Badge tone="success">{pending.inserts} new</Badge>}
          {pending.updates > 0 && <Badge tone="warning">{pending.updates} edited</Badge>}
          {pending.deletes > 0 && <Badge tone="danger">{pending.deletes} removed</Badge>}
          <Button variant="ghost" size="xs" onClick={onDiscard} disabled={busy}>
            Discard
          </Button>
          <Button size="xs" onClick={onReview} disabled={busy}>
            {busy ? "Working…" : "Review and save"}
          </Button>
        </>
      )}
    </div>
  );
}
