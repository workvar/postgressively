"use client";

import { useCallback, useEffect, useState } from "react";
import DataTable from "@/components/DataTable";
import DataGrid from "@/components/grid/DataGrid";
import Badge from "@/components/ui/Badge";
import Tabs from "@/components/ui/Tabs";
import { EmptyState, ErrorNote, SectionTitle } from "@/components/ui/Panel";
import { fetchTableRows, fetchTableSchema } from "@/lib/tables";
import type { QueryResult, TableDetail as Detail } from "@/lib/types";

const tabs = ["data", "schema"] as const;
type Tab = (typeof tabs)[number];

const ROW_LIMIT = 100;

export default function TableDetail({
  db,
  schema,
  table,
}: {
  db: string;
  schema: string;
  table: string;
}) {
  const [tab, setTab] = useState<Tab>("data");
  const [detail, setDetail] = useState<Detail | null>(null);
  const [rows, setRows] = useState<QueryResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    let stale = false;
    setDetail(null);
    setRows(null);
    setError(null);

    fetchTableSchema(db, schema, table)
      .then((d) => !stale && setDetail(d))
      .catch((e) => !stale && setError(e.message));
    fetchTableRows(db, schema, table, ROW_LIMIT)
      .then((r) => !stale && setRows(r))
      .catch((e) => !stale && setError(e.message));

    return () => {
      stale = true;
    };
  }, [db, schema, table]);

  useEffect(() => load(), [load]);

  return (
    <div className="animate-fadeUp">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h2 className="font-mono text-[20px] font-semibold tracking-tight">
          <span className="text-fg-subtle">
            {db}.{schema}.
          </span>
          {table}
        </h2>
        {detail && <Badge tone="accent">{detail.columns.length} columns</Badge>}
        {detail && <Badge>{detail.indexes.length} indexes</Badge>}
        {rows?.truncated && <Badge>first {ROW_LIMIT} rows</Badge>}
        {detail?.editable === false && <Badge tone="warning">read only</Badge>}
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="mb-5">
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
      </div>

      {tab === "data" &&
        (rows && detail ? (
          <DataGrid
            db={db}
            schema={schema}
            table={table}
            result={rows}
            columns={detail.columns}
            writable={detail.editable !== false}
            onSaved={load}
          />
        ) : (
          <EmptyState title="Loading rows…" />
        ))}

      {tab === "schema" &&
        (detail ? (
          <div className="space-y-6">
            <div>
              <SectionTitle>Columns</SectionTitle>
              <DataTable
                columns={["name", "type", "nullable", "default", "primary key"]}
                rows={detail.columns.map((c) => [
                  c.name,
                  c.type,
                  c.nullable,
                  c.default,
                  c.isPrimaryKey,
                ])}
              />
            </div>
            <div>
              <SectionTitle>Indexes</SectionTitle>
              <DataTable
                columns={["name", "definition"]}
                rows={detail.indexes.map((i) => [i.name, i.definition])}
              />
            </div>
          </div>
        ) : (
          <EmptyState title="Loading schema…" />
        ))}
    </div>
  );
}
