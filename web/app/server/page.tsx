"use client";

import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import Card from "@/components/Card";
import BackupPanel from "@/components/BackupPanel";
import ServiceHeader from "@/components/layout/ServiceHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Panel, { ErrorNote } from "@/components/ui/Panel";
import { api } from "@/lib/api";
import { bytes } from "@/lib/format";
import { cleanVersion } from "@/lib/instances";
import type { AgentStatus } from "@/lib/types";

type Stats = {
  loadAverage: number[] | null;
  memory: Record<string, number> | null;
  disk: Record<string, number> | null;
  uptime: number;
};

const actions = ["start", "restart", "reload", "stop"] as const;

export default function ServerPage() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.get<AgentStatus>("/api/agent/status").then(setStatus).catch((e) => setError(e.message));
    api.get<Stats>("/api/agent/stats").then(setStats).catch(() => setStats(null));
    api
      .get<{ lines: string[] }>("/api/agent/logs?lines=100")
      .then((r) => setLogs(r.lines))
      .catch(() => setLogs([]));
  }, []);

  useEffect(load, [load]);

  async function control(action: string) {
    setError(null);
    try {
      await api.post(`/api/agent/service/${action}`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "action failed");
    }
  }

  const uptimeHours = stats?.uptime ? (stats.uptime / 3600).toFixed(1) : null;

  return (
    <Shell>
      <ServiceHeader
        name={status?.service ?? "postgresql"}
        version={cleanVersion(status?.version)}
        status={status?.active ?? "unknown"}
        extra={
          status && (
            <>
              <Badge>{status.enabled}</Badge>
              <Badge>
                {status.host}:{status.port}
              </Badge>
              {uptimeHours && <Badge tone="info">up {uptimeHours}h</Badge>}
            </>
          )
        }
        action={
          <div className="flex flex-wrap gap-1.5">
            {actions.map((a) => (
              <Button
                key={a}
                size="sm"
                variant={a === "stop" ? "danger" : "secondary"}
                onClick={() => control(a)}
                className="capitalize"
              >
                {a}
              </Button>
            ))}
          </div>
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Service" value={status?.active ?? "unknown"} hint={status?.enabled} />
        <Card title="Load (1m)" value={stats?.loadAverage?.[0]?.toFixed(2) ?? "—"} hint="Host average" />
        <Card
          title="Memory free"
          value={stats?.memory ? bytes(stats.memory.MemAvailableBytes ?? 0) : "—"}
          hint={stats?.memory ? `of ${bytes(stats.memory.MemTotalBytes ?? 0)}` : undefined}
        />
        <Card
          title="Disk free"
          value={stats?.disk ? bytes(stats.disk.freeBytes ?? 0) : "—"}
          hint={stats?.disk ? `of ${bytes(stats.disk.totalBytes ?? 0)}` : undefined}
        />
      </div>

      <div className="mt-5 grid grid-cols-1 gap-5 xl:grid-cols-2">
        <BackupPanel />
        <Panel title="Recent logs" description="Last 100 lines from the service journal." tint padded={false}>
          <pre className="max-h-[360px] overflow-auto bg-surface p-3 font-mono text-micro leading-relaxed text-fg-muted">
            {logs.length ? logs.join("\n") : "No log output available."}
          </pre>
        </Panel>
      </div>
    </Shell>
  );
}
