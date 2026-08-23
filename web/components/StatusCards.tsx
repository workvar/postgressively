"use client";

import { useEffect, useState } from "react";
import Card from "./Card";
import Badge, { toneForState } from "./ui/Badge";
import { ErrorNote } from "./ui/Panel";
import { api } from "@/lib/api";
import { bytes } from "@/lib/format";
import type { AgentStatus, Database } from "@/lib/types";

export default function StatusCards() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<Database[]>("/api/databases").then(setDatabases).catch((e) => setError(e.message));
    api.get<AgentStatus>("/api/agent/status").then(setStatus).catch(() => setStatus(null));
  }, []);

  const totalSize = databases.reduce((sum, d) => sum + d.sizeBytes, 0);
  const active = status?.active ?? "unknown";

  return (
    <>
      {error && <ErrorNote>{error}</ErrorNote>}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card
          title="Service"
          value={active}
          hint={
            status?.manager && status.manager !== "none"
              ? `${status.service} · ${status.manager}`
              : status?.service
          }
          badge={
            <Badge tone={toneForState(active)} dot>
              {status?.enabled || "unknown"}
            </Badge>
          }
        />
        <Card
          title="Version"
          value={status?.version?.replace("postgres (PostgreSQL) ", "") ?? "—"}
          hint={status ? `${status.host}:${status.port}` : undefined}
        />
        <Card title="Databases" value={String(databases.length)} hint="Managed on this server" />
        <Card title="Total size" value={bytes(totalSize)} hint="Across all databases" />
      </div>
    </>
  );
}
