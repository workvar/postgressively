"use client";

import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { EmptyState } from "@/components/ui/Panel";
import { Table, TableWrap, Td, Th, Tr } from "@/components/ui/Table";
import { LOCAL_CONNECTION } from "@/lib/activeConnection";
import type { Connection, EngineDescriptor } from "@/lib/connections";

/** The saved connections, plus the built-in local instance as the first row. */
export default function ConnectionList({
  connections,
  engines,
  active,
  onUse,
  onDelete,
}: {
  connections: Connection[];
  engines: EngineDescriptor[];
  active: string;
  onUse: (id: string) => void;
  onDelete: (c: Connection) => void;
}) {
  const label = (kind: string) => engines.find((e) => e.kind === kind)?.label ?? kind;

  return (
    <TableWrap>
      <Table>
        <thead>
          <tr>
            <Th>Name</Th>
            <Th>Engine</Th>
            <Th>Endpoint</Th>
            <Th>Database</Th>
            <Th>Connection string</Th>
            <Th />
          </tr>
        </thead>
        <tbody>
          <Tr>
            <Td className="font-medium">This server</Td>
            <Td className="text-fg-muted">PostgreSQL</Td>
            <Td className="font-mono text-caption text-fg-muted">local</Td>
            <Td className="text-fg-muted">—</Td>
            <Td className="text-fg-subtle">Configured with PG_DATABASE_URL</Td>
            <Td className="text-right">
              <UseButton
                active={active === LOCAL_CONNECTION}
                onClick={() => onUse(LOCAL_CONNECTION)}
              />
            </Td>
          </Tr>

          {connections.map((c) => (
            <Tr key={c.id}>
              <Td className="font-medium">{c.name}</Td>
              <Td className="text-fg-muted">
                <span className="inline-flex items-center gap-1.5">
                  {label(c.engine)}
                  {!c.editable && <Badge>read only</Badge>}
                </span>
              </Td>
              <Td className="font-mono text-caption text-fg-muted">{c.endpoint || "—"}</Td>
              <Td className="text-fg-muted">{c.database || "—"}</Td>
              <Td className="max-w-[280px] font-mono text-caption text-fg-subtle">
                <span className="block truncate" title={c.redacted}>
                  {c.redacted}
                </span>
              </Td>
              <Td className="text-right">
                <span className="inline-flex gap-1.5">
                  <UseButton active={active === String(c.id)} onClick={() => onUse(String(c.id))} />
                  <Button variant="danger" size="xs" onClick={() => onDelete(c)}>
                    Remove
                  </Button>
                </span>
              </Td>
            </Tr>
          ))}
        </tbody>
      </Table>

      {connections.length === 0 && (
        <EmptyState title="No other databases yet">
          Add a connection string to browse a remote Postgres, MySQL, SQLite or SQL Server database.
        </EmptyState>
      )}
    </TableWrap>
  );
}

function UseButton({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <Button variant={active ? "primary" : "secondary"} size="xs" onClick={onClick} disabled={active}>
      {active ? "In use" : "Use"}
    </Button>
  );
}
