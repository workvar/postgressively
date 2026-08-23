"use client";

import { EmptyState } from "@/components/ui/Panel";
import { bytes } from "@/lib/format";
import type { Table } from "@/lib/types";

export function tableKey(t: Table) {
  return `${t.schema}.${t.name}`;
}

export default function TableList({
  tables,
  selected,
  onSelect,
  loading,
}: {
  tables: Table[];
  selected: Table | null;
  onSelect: (t: Table) => void;
  loading?: boolean;
}) {
  if (loading) {
    return (
      <div className="rounded-xl border border-line bg-surface shadow-card">
        <EmptyState title="Loading tables…" />
      </div>
    );
  }

  if (tables.length === 0) {
    return (
      <div className="rounded-xl border border-line bg-surface shadow-card">
        <EmptyState title="No tables">
          This database has no user tables, or none match your filter.
        </EmptyState>
      </div>
    );
  }

  return (
    <ul className="max-h-[72vh] divide-y divide-line overflow-y-auto rounded-xl border border-line bg-surface shadow-card">
      {tables.map((t) => {
        const active = selected != null && tableKey(selected) === tableKey(t);
        return (
          <li key={tableKey(t)}>
            <button
              onClick={() => onSelect(t)}
              className={`w-full border-l-2 px-3 py-2 text-left transition-colors duration-100 ease-apple ${
                active
                  ? "border-accent bg-accent-soft/50"
                  : "border-transparent hover:bg-surface-hover"
              }`}
            >
              <div
                className={`truncate font-mono text-caption ${active ? "text-accent" : "text-fg"}`}
              >
                {t.schema}.{t.name}
              </div>
              <div className="mt-0.5 text-micro text-fg-subtle">
                {t.kind} · {bytes(t.sizeBytes)} · ~{t.estimatedRows.toLocaleString()} rows
              </div>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
