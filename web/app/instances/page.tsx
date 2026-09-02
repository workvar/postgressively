"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import PageHeader from "@/components/layout/PageHeader";
import ConnectionPanel from "@/components/instances/ConnectionPanel";
import DiscoveredPanel from "@/components/instances/DiscoveredPanel";
import Badge, { toneForState } from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/Field";
import { EmptyState, ErrorNote } from "@/components/ui/Panel";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/Table";
import { api } from "@/lib/api";
import { bytes } from "@/lib/format";
import { buildInstances, cleanVersion } from "@/lib/instances";
import type { AgentStatus, Database } from "@/lib/types";

export default function InstancesPage() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [databases, setDatabases] = useState<Database[]>([]);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.get<AgentStatus>("/api/agent/status").then(setStatus).catch(() => setStatus(null));
    api.get<Database[]>("/api/databases").then(setDatabases).catch((e) => setError(e.message));
  }, []);

  const instances = useMemo(() => buildInstances(status, databases), [status, databases]);
  const visible = instances.filter((i) => i.name.toLowerCase().includes(filter.toLowerCase()));
  const current = instances.find((i) => i.name === selected) ?? null;

  return (
    <Shell>
      <PageHeader
        title="Instances"
        description="Every Postgres database this agent manages, with ready-to-use connection details."
        meta={
          status && (
            <>
              <Badge tone="accent">{cleanVersion(status.version)}</Badge>
              <Badge tone={toneForState(status.active)} dot>
                {status.active}
              </Badge>
              <Badge>
                {status.host}:{status.port}
              </Badge>
              <Badge>{instances.length} databases</Badge>
            </>
          )
        }
        action={
          <>
            <Button variant="secondary" size="sm" onClick={() => location.reload()}>
              Refresh
            </Button>
            <Link href="/databases/new">
              <Button variant="primary" size="sm">
                New database
              </Button>
            </Link>
          </>
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        <SearchInput
          placeholder="Search databases…"
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="w-full max-w-xs"
        />
        <span className="text-caption text-fg-subtle">
          Showing {visible.length} of {instances.length}
        </span>
      </div>

      <TableWrap>
        <Table>
          <thead>
            <tr>
              <Th>Database</Th>
              <Th>Owner</Th>
              <Th>Version</Th>
              <Th>Endpoint</Th>
              <Th>SSL</Th>
              <Th>Size</Th>
              <Th>Status</Th>
              <Th />
            </tr>
          </thead>
          <tbody>
            {visible.map((i) => (
              <Tr key={i.name}>
                <Td className="font-medium">{i.name}</Td>
                <Td className="text-fg-muted">{i.owner}</Td>
                <Td className="text-fg-muted">{i.version}</Td>
                <Td className="font-mono text-caption text-fg-muted">
                  {i.host}:{i.port}
                </Td>
                <Td className="text-fg-muted">{i.sslMode}</Td>
                <Td className="tabular-nums text-fg-muted">{bytes(i.sizeBytes)}</Td>
                <Td>
                  <Badge tone={toneForState(i.status)} dot>
                    {i.status}
                  </Badge>
                </Td>
                <Td className="text-right">
                  <Button
                    variant={selected === i.name ? "primary" : "secondary"}
                    size="xs"
                    onClick={() => setSelected(selected === i.name ? null : i.name)}
                  >
                    {selected === i.name ? "Hide" : "Connect"}
                  </Button>
                </Td>
              </Tr>
            ))}
          </tbody>
        </Table>
        {visible.length === 0 && (
          <EmptyState title="No databases found">
            Create one with the wizard, or clear your search filter.
          </EmptyState>
        )}
      </TableWrap>

      {current && (
        <div className="mt-5">
          <ConnectionPanel instance={current} />
        </div>
      )}

      <div className="mt-5">
        <DiscoveredPanel />
      </div>
    </Shell>
  );
}
