"use client";

import Badge from "@/components/ui/Badge";
import UriText from "@/components/ui/UriText";
import { PASSWORD_PLACEHOLDER } from "@/lib/instances";
import type { DraftDatabase } from "@/lib/wizard";
import type { AgentStatus } from "@/lib/types";

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 border-b border-line py-2.5 last:border-0">
      <span className="w-44 shrink-0 text-small text-fg-muted">{label}</span>
      <span className="min-w-0 flex-1 text-small text-fg">{value}</span>
    </div>
  );
}

export default function StepReview({
  draft,
  status,
}: {
  draft: DraftDatabase;
  status: AgentStatus | null;
}) {
  const host = status?.host ?? "localhost";
  const port = status?.port ?? 5432;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-1 text-subtitle">Review</h2>
        <p className="mb-3 text-small text-fg-muted">
          Nothing has been created yet. Check the details, then create the database.
        </p>
        <div className="rounded-xl border border-line bg-surface px-4 shadow-card">
          <Row label="Database name" value={<span className="font-mono">{draft.name || "—"}</span>} />
          <Row label="Template" value={draft.template} />
          <Row label="Encoding / locale" value={`${draft.encoding} · ${draft.locale}`} />
          <Row
            label="Extensions"
            value={
              draft.extensions.length ? (
                <span className="flex flex-wrap gap-1.5">
                  {draft.extensions.map((e) => (
                    <Badge key={e} tone="accent">
                      {e}
                    </Badge>
                  ))}
                </span>
              ) : (
                "None"
              )
            }
          />
          <Row
            label="Owner"
            value={`${draft.owner}${draft.createOwner ? " (will be created)" : ""}`}
          />
          <Row label="Connection limit" value={String(draft.connectionLimit)} />
          <Row
            label="Pooling"
            value={draft.pooling ? `${draft.poolMode}, size ${draft.poolSize}` : "Disabled"}
          />
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-subtitle">Resulting connection string</h2>
        <pre className="overflow-x-auto rounded-lg border border-line bg-surface-2 p-3 font-mono text-caption text-fg">
          <UriText
            value={`postgresql://${draft.owner}:${PASSWORD_PLACEHOLDER}@${host}:${port}/${draft.name || "dbname"}?sslmode=prefer`}
          />
        </pre>
      </section>
    </div>
  );
}
