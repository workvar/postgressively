"use client";

import Badge from "@/components/ui/Badge";
import type { ConnectionTest } from "@/lib/connections";

/** Inline result of the "Test connection" button, success or failure. */
export default function TestSummary({ result }: { result: ConnectionTest }) {
  if (!result.ok) {
    return (
      <div className="rounded-lg border border-danger/30 bg-danger-soft px-3 py-2.5">
        <p className="text-small font-medium text-danger">Could not connect</p>
        <p className="mt-0.5 break-words font-mono text-caption text-danger">{result.error}</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-line bg-surface-2 px-3 py-2.5">
      <div className="flex flex-wrap items-center gap-1.5">
        <Badge tone="success" dot>
          Connected
        </Badge>
        {result.database && <Badge>{result.database}</Badge>}
        <Badge>{result.tables} tables</Badge>
        <Badge>{result.databases} databases</Badge>
        <Badge>{result.elapsedMs} ms</Badge>
      </div>
      {result.version && (
        <p className="mt-1.5 break-words font-mono text-caption text-fg-muted">{result.version}</p>
      )}
    </div>
  );
}
