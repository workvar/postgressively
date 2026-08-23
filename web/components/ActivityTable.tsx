"use client";

import { useCallback, useEffect, useState } from "react";
import Badge, { toneForState } from "./ui/Badge";
import Button from "./ui/Button";
import { EmptyState, ErrorNote } from "./ui/Panel";
import { Table, TableWrap, Td, Th, Tr, mono } from "./ui/Table";
import { api } from "@/lib/api";
import type { Activity } from "@/lib/types";

const headers = ["PID", "User", "Database", "State", "Active", "Query", ""];

export default function ActivityTable() {
  const [rows, setRows] = useState<Activity[]>([]);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    api.get<Activity[]>("/api/activity").then(setRows).catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    load();
    const t = setInterval(load, 10000);
    return () => clearInterval(t);
  }, [load]);

  async function terminate(pid: number) {
    try {
      await api.post(`/api/activity/${pid}/terminate`);
      load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "failed");
    }
  }

  if (error) return <ErrorNote>{error}</ErrorNote>;

  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            {headers.map((h, i) => (
              <Th key={h || i}>{h}</Th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <Tr key={r.pid}>
              <Td className={`${mono} text-fg-muted`}>{r.pid}</Td>
              <Td>{r.user ?? "—"}</Td>
              <Td className="font-medium">{r.database ?? "—"}</Td>
              <Td>
                <Badge tone={toneForState(r.state)} dot>
                  {r.state ?? "unknown"}
                </Badge>
              </Td>
              <Td className="tabular-nums text-fg-muted">{r.secondsActive.toFixed(1)}s</Td>
              <Td className={`max-w-md truncate ${mono} text-fg-muted`}>{r.query ?? ""}</Td>
              <Td className="text-right">
                <Button variant="danger" size="sm" onClick={() => terminate(r.pid)}>
                  Terminate
                </Button>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>
      {rows.length === 0 && <EmptyState>No active connections right now.</EmptyState>}
    </TableWrap>
  );
}
