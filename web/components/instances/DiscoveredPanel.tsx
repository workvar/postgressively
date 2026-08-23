"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import Panel, { EmptyState } from "@/components/ui/Panel";
import { Table, Td, Th, Tr } from "@/components/ui/Table";
import { discoveredKey, fetchDiscovered, sourceLabel } from "@/lib/discover";
import type { DiscoveredInstance } from "@/lib/types";

/**
 * Read-only view of database engines the agent found on its host, including
 * ones this app does not manage.
 */
export default function DiscoveredPanel() {
  const [items, setItems] = useState<DiscoveredInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function load() {
    setLoading(true);
    setError(null);
    fetchDiscovered()
      .then(setItems)
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }

  useEffect(load, []);

  return (
    <Panel
      title="Detected on this host"
      description="Local database engines found by port and binary scan."
      padded={false}
      tint
      action={
        <Button variant="secondary" size="sm" onClick={load} disabled={loading}>
          {loading ? "Scanning…" : "Rescan"}
        </Button>
      }
    >
      {error ? (
        <EmptyState title="Scan unavailable">{error}</EmptyState>
      ) : items.length === 0 ? (
        <EmptyState title={loading ? "Scanning…" : "Nothing detected"}>
          {loading ? undefined : "No database ports or server binaries were found."}
        </EmptyState>
      ) : (
        <Table>
          <thead>
            <tr>
              <Th>Engine</Th>
              <Th>Version</Th>
              <Th>Endpoint</Th>
              <Th>Process</Th>
              <Th>How it was found</Th>
              <Th>State</Th>
            </tr>
          </thead>
          <tbody>
            {items.map((i) => (
              <Tr key={discoveredKey(i)}>
                <Td className="font-medium">
                  <span className="flex items-center gap-2">
                    {i.label}
                    {i.managed && <Badge tone="accent">managed</Badge>}
                  </span>
                </Td>
                <Td className="text-fg-muted">{i.version || "—"}</Td>
                <Td className="font-mono text-caption text-fg-muted">
                  {i.port ? `${i.host ?? "127.0.0.1"}:${i.port}` : "—"}
                </Td>
                <Td className="font-mono text-caption text-fg-muted">{i.process || "—"}</Td>
                <Td className="text-caption text-fg-muted">{sourceLabel(i)}</Td>
                <Td>
                  <Badge tone={i.listening ? "success" : "neutral"} dot>
                    {i.listening ? "running" : "installed"}
                  </Badge>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
      )}
    </Panel>
  );
}
