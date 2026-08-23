"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import Shell from "@/components/Shell";
import PageHeader from "@/components/layout/PageHeader";
import DatabaseDrawer from "@/components/databases/DatabaseDrawer";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { SearchInput } from "@/components/ui/Field";
import { EmptyState, ErrorNote } from "@/components/ui/Panel";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/Table";
import { api } from "@/lib/api";
import { bytes } from "@/lib/format";
import type { AgentStatus, DatabaseDetail } from "@/lib/types";

export default function DatabasesPage() {
  const [rows, setRows] = useState<DatabaseDetail[]>([]);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api
      .get<DatabaseDetail[]>("/api/databases/details")
      .then((d) => {
        setRows(d);
        setError(null);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    api.get<AgentStatus>("/api/agent/status").then(setStatus).catch(() => setStatus(null));
  }, [load]);

  const visible = rows.filter((d) => d.name.toLowerCase().includes(filter.toLowerCase()));
  const current = rows.find((d) => d.name === selected) ?? null;
  const totalSize = rows.reduce((s, d) => s + d.sizeBytes, 0);

  return (
    <Shell>
      <PageHeader
        title="Databases"
        description="Every database on this Postgres connection, with its settings and extensions."
        meta={
          <>
            <Badge tone="accent">{rows.length} databases</Badge>
            <Badge>{bytes(totalSize)} on disk</Badge>
            {status && (
              <Badge>
                {status.host}:{status.port}
              </Badge>
            )}
          </>
        }
        action={
          <>
            <Button variant="secondary" size="sm" onClick={load}>
              Refresh
            </Button>
            <Link href="/databases/new">
              <Button variant="brand" size="sm">
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
          Showing {visible.length} of {rows.length}
        </span>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_minmax(0,420px)]">
        <TableWrap>
          <Table>
            <thead>
              <tr>
                <Th>Database</Th>
                <Th>Owner</Th>
                <Th>Encoding</Th>
                <Th>Collation</Th>
                <Th>Conns</Th>
                <Th>Limit</Th>
                <Th>Size</Th>
                <Th />
              </tr>
            </thead>
            <tbody>
              {visible.map((d) => (
                <Tr key={d.name}>
                  <Td>
                    <span className="flex items-center gap-2">
                      <span className="font-medium">{d.name}</span>
                      {d.isCurrent && <Badge tone="info">console</Badge>}
                      {!d.allowConnections && <Badge tone="danger">no connect</Badge>}
                    </span>
                  </Td>
                  <Td className="text-fg-muted">{d.owner}</Td>
                  <Td className="text-fg-muted">{d.encoding}</Td>
                  <Td className="truncate text-fg-muted">{d.collate}</Td>
                  <Td className="tabular-nums text-fg-muted">{d.activeConnections}</Td>
                  <Td className="tabular-nums text-fg-muted">
                    {d.connectionLimit === -1 ? "∞" : d.connectionLimit}
                  </Td>
                  <Td className="tabular-nums text-fg-muted">{bytes(d.sizeBytes)}</Td>
                  <Td className="text-right">
                    <Button
                      variant={selected === d.name ? "primary" : "secondary"}
                      size="xs"
                      onClick={() => setSelected(selected === d.name ? null : d.name)}
                    >
                      {selected === d.name ? "Close" : "Manage"}
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
          <DatabaseDrawer
            db={current}
            host={status?.host ?? "localhost"}
            port={status?.port ?? 5432}
            onDropped={() => {
              setSelected(null);
              load();
            }}
          />
        )}
      </div>
    </Shell>
  );
}
