"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Shell from "@/components/Shell";
import ActivityTable from "@/components/ActivityTable";
import Card from "@/components/Card";
import ServiceHeader from "@/components/layout/ServiceHeader";
import ConnectionPanel from "@/components/instances/ConnectionPanel";
import Badge from "@/components/ui/Badge";
import Banner from "@/components/ui/Banner";
import Button from "@/components/ui/Button";
import { EmptyState, SectionTitle } from "@/components/ui/Panel";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/Table";
import { api } from "@/lib/api";
import { bytes } from "@/lib/format";
import { buildInstances, cleanVersion } from "@/lib/instances";
import type { AgentStatus, Database } from "@/lib/types";

export default function DashboardPage() {
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [databases, setDatabases] = useState<Database[]>([]);

  useEffect(() => {
    api.get<AgentStatus>("/api/agent/status").then(setStatus).catch(() => setStatus(null));
    api.get<Database[]>("/api/databases").then(setDatabases).catch(() => setDatabases([]));
  }, []);

  const instances = useMemo(() => buildInstances(status, databases), [status, databases]);
  const primary = instances[0] ?? null;
  const totalSize = databases.reduce((s, d) => s + d.sizeBytes, 0);

  return (
    <Shell>
      <ServiceHeader
        name={status?.service ?? "postgresql"}
        version={cleanVersion(status?.version)}
        status={status?.active ?? "unknown"}
        extra={
          status && (
            <>
              <Badge>
                {status.host}:{status.port}
              </Badge>
              <Badge tone="info">{databases.length} databases</Badge>
            </>
          )
        }
        action={
          <>
            <Link href="/query">
              <Button variant="secondary" size="sm">
                Open SQL console
              </Button>
            </Link>
            <Link href="/databases/new">
              <Button variant="primary" size="sm">
                New database
              </Button>
            </Link>
          </>
        }
      />

      <Banner
        title="Schedule nightly backups"
        body="Backups currently run only when you trigger them. Set a schedule so a bad migration is never fatal."
        ctaLabel="Configure backups"
        href="/server"
      />

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card title="Service" value={status?.active ?? "unknown"} hint={status?.enabled} />
        <Card title="Version" value={cleanVersion(status?.version)} hint={status?.service} />
        <Card title="Databases" value={String(databases.length)} hint="Managed by this agent" />
        <Card title="Total size" value={bytes(totalSize)} hint="On-disk, all databases" />
      </div>

      <div className="mt-6 grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <div>
          <SectionTitle
            action={<span className="text-caption text-fg-subtle">Refreshes every 10s</span>}
          >
            Active connections
          </SectionTitle>
          <ActivityTable />

          <div className="mt-6">
            <SectionTitle
              action={
                <Link href="/instances" className="text-small font-medium text-accent hover:underline">
                  View all →
                </Link>
              }
            >
              Databases
            </SectionTitle>
            <TableWrap>
              <Table>
                <thead>
                  <tr>
                    <Th>Name</Th>
                    <Th>Owner</Th>
                    <Th>Size</Th>
                  </tr>
                </thead>
                <tbody>
                  {databases.map((d) => (
                    <Tr key={d.name}>
                      <Td className="font-medium">{d.name}</Td>
                      <Td className="text-fg-muted">{d.owner}</Td>
                      <Td className="tabular-nums text-fg-muted">{bytes(d.sizeBytes)}</Td>
                    </Tr>
                  ))}
                </tbody>
              </Table>
              {databases.length === 0 && (
                <EmptyState title="No databases yet">
                  Create your first one with the new database wizard.
                </EmptyState>
              )}
            </TableWrap>
          </div>
        </div>

        {primary && <ConnectionPanel instance={primary} />}
      </div>
    </Shell>
  );
}
