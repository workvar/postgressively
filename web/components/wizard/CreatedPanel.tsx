"use client";

import Link from "next/link";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import CopyRow from "@/components/ui/CopyRow";
import Panel from "@/components/ui/Panel";
import { PASSWORD_PLACEHOLDER } from "@/lib/instances";
import type { AgentStatus, CreateDatabaseResult } from "@/lib/types";

export default function CreatedPanel({
  result,
  status,
}: {
  result: CreateDatabaseResult;
  status: AgentStatus | null;
}) {
  const host = status?.host ?? "localhost";
  const port = status?.port ?? 5432;
  const password = result.generatedPassword ?? PASSWORD_PLACEHOLDER;
  const uri = `postgresql://${result.owner}:${password}@${host}:${port}/${result.name}`;

  return (
    <div className="animate-fadeUp space-y-4">
      <div className="rounded-xl border border-success/25 bg-success-soft px-4 py-3">
        <p className="text-subtitle text-success">Database created</p>
        <p className="mt-0.5 text-small text-fg-muted">
          <span className="font-mono">{result.name}</span> is ready and owned by{" "}
          <span className="font-mono">{result.owner}</span>.
        </p>
      </div>

      {result.generatedPassword && (
        <div className="rounded-xl border border-warning/30 bg-warning-soft px-4 py-3">
          <p className="text-small font-semibold text-warning">Save this password now</p>
          <p className="mt-0.5 text-caption text-fg-muted">
            The role <span className="font-mono">{result.owner}</span> was created. This password is
            shown once and is not stored anywhere.
          </p>
          <code className="mt-2 block break-all rounded-lg border border-line bg-surface p-2.5 font-mono text-caption">
            {result.generatedPassword}
          </code>
        </div>
      )}

      <Panel title="Connection details" tint padded={false}>
        <CopyRow label="Service URI" value={uri} secret />
        <CopyRow label="Host" value={host} />
        <CopyRow label="Port" value={String(port)} />
        <CopyRow label="Database" value={result.name} />
        <CopyRow label="User" value={result.owner} />
      </Panel>

      {result.extensions.length > 0 && (
        <Panel title="Extensions installed" tint>
          <div className="flex flex-wrap gap-1.5">
            {result.extensions.map((e) => (
              <Badge key={e} tone="accent">
                {e}
              </Badge>
            ))}
          </div>
        </Panel>
      )}

      <div className="flex flex-wrap gap-2">
        <Link href="/databases">
          <Button size="md">Go to databases</Button>
        </Link>
        <Link href="/query">
          <Button variant="secondary" size="md">
            Open SQL console
          </Button>
        </Link>
      </div>
    </div>
  );
}
