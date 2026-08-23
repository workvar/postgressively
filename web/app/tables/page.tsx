"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import PageHeader from "@/components/layout/PageHeader";
import DatabasePicker from "@/components/tables/DatabasePicker";
import TableDetail from "@/components/tables/TableDetail";
import TableList from "@/components/tables/TableList";
import Badge from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/Field";
import { EmptyState, ErrorNote } from "@/components/ui/Panel";
import { api } from "@/lib/api";
import { bytes } from "@/lib/format";
import { fetchTables } from "@/lib/tables";
import type { Database, Table } from "@/lib/types";

export default function TablesPage() {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [db, setDb] = useState("");
  const [tables, setTables] = useState<Table[]>([]);
  const [loading, setLoading] = useState(false);
  const [filter, setFilter] = useState("");
  const [selected, setSelected] = useState<Table | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api
      .get<Database[]>("/api/databases")
      .then((list) => {
        setDatabases(list);
        const initial = list.find((d) => d.isDefault) ?? list[0];
        if (initial) setDb((cur) => cur || initial.name);
      })
      .catch((e) => setError(e.message));
  }, []);

  useEffect(() => {
    if (!db) return;
    let stale = false;
    setLoading(true);
    setSelected(null);
    setError(null);

    fetchTables(db)
      .then((t) => !stale && setTables(t))
      .catch((e) => {
        if (stale) return;
        setTables([]);
        setError(e.message);
      })
      .finally(() => !stale && setLoading(false));

    return () => {
      stale = true;
    };
  }, [db]);

  const visible = tables.filter((t) =>
    `${t.schema}.${t.name}`.toLowerCase().includes(filter.toLowerCase())
  );
  const totalSize = tables.reduce((s, t) => s + t.sizeBytes, 0);

  return (
    <Shell>
      <PageHeader
        title="Tables"
        description="Pick a database, then browse its tables, rows, and schema."
        meta={
          <>
            <Badge tone="accent">{tables.length} tables</Badge>
            <Badge>{bytes(totalSize)} total</Badge>
          </>
        }
      />

      <div className="mb-5">
        <DatabasePicker databases={databases} value={db} onChange={setDb} disabled={loading} />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[300px_minmax(0,1fr)]">
        <div>
          <SearchInput
            placeholder="Filter tables…"
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="mb-2.5"
          />
          <TableList
            tables={visible}
            selected={selected}
            onSelect={setSelected}
            loading={loading}
          />
        </div>

        <div>
          {selected ? (
            <TableDetail db={db} schema={selected.schema} table={selected.name} />
          ) : (
            <div className="grid h-full min-h-[300px] place-items-center rounded-xl border border-dashed border-line-strong bg-surface/60 px-6">
              <EmptyState title="Nothing selected">
                Pick a table to see its data or schema.
              </EmptyState>
            </div>
          )}
        </div>
      </div>
    </Shell>
  );
}
