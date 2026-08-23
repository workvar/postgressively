"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import DataTable from "@/components/DataTable";
import PageHeader from "@/components/layout/PageHeader";
import SnippetRail from "@/components/query/SnippetRail";
import SqlEditor from "@/components/query/SqlEditor";
import DatabasePicker from "@/components/tables/DatabasePicker";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { EmptyState, ErrorNote } from "@/components/ui/Panel";
import { api } from "@/lib/api";
import { fetchCompletions, invalidateCompletions } from "@/lib/completions";
import { fetchDatabases, initialDatabase } from "@/lib/databases";
import type { CompletionSource, Database, QueryResult } from "@/lib/types";

export default function QueryPage() {
  const [databases, setDatabases] = useState<Database[]>([]);
  const [db, setDb] = useState("");
  const [source, setSource] = useState<CompletionSource | null>(null);
  const [sql, setSql] = useState("SELECT now(), version();");
  const [results, setResults] = useState<QueryResult[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetchDatabases()
      .then((list) => {
        setDatabases(list);
        setDb((cur) => cur || initialDatabase(list));
      })
      .catch((e) => setError(e.message));
  }, []);

  // Autocomplete follows the selected database.
  useEffect(() => {
    if (!db) return;
    let stale = false;
    setSource(null);
    fetchCompletions(db)
      .then((s) => !stale && setSource(s))
      .catch(() => !stale && setSource(null));
    return () => {
      stale = true;
    };
  }, [db]);

  async function run() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<{ results: QueryResult[] }>("/api/query", { sql, db });
      setResults(res.results);
      // DDL in the console changes what should be suggested next.
      if (/\b(create|alter|drop)\b/i.test(sql)) {
        invalidateCompletions(db);
        fetchCompletions(db).then(setSource).catch(() => undefined);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "query failed");
      setResults([]);
    } finally {
      setBusy(false);
    }
  }

  return (
    <Shell>
      <PageHeader
        title="SQL console"
        description="Pick a database, then run statements against it."
        action={
          <>
            <span className="hidden text-caption text-fg-subtle sm:inline">⌘ / Ctrl + Enter</span>
            <Button size="md" onClick={run} disabled={busy || !db}>
              {busy ? "Running…" : "Run query"}
            </Button>
          </>
        }
      />

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <DatabasePicker databases={databases} value={db} onChange={setDb} disabled={busy} />
        <Badge tone={source ? "accent" : "neutral"}>
          {source ? `${source.relations.length} tables indexed` : "loading suggestions…"}
        </Badge>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1fr)_260px]">
        <div className="min-w-0">
          <div className="overflow-hidden rounded-xl border border-line bg-surface shadow-card">
            <div className="flex items-center justify-between border-b border-line bg-surface-2 px-3 py-1.5">
              <span className="text-caption font-medium text-fg-muted">
                Statement {db && <span className="text-fg-subtle">· {db}</span>}
              </span>
              <button
                onClick={() => setSql("")}
                className="text-caption text-fg-subtle transition-colors hover:text-fg"
              >
                Clear
              </button>
            </div>
            <SqlEditor value={sql} onChange={setSql} onRun={run} source={source} />
          </div>

          {error && (
            <div className="mt-4">
              <ErrorNote>{error}</ErrorNote>
            </div>
          )}

          <div className="mt-5 space-y-6">
            {results.map((r, i) => (
              <div key={i} className="animate-fadeUp">
                <div className="mb-2 flex flex-wrap items-center gap-1.5">
                  <Badge tone="accent">{r.command}</Badge>
                  <Badge>{r.rowCount} rows</Badge>
                  <Badge>{r.durationMs.toFixed(1)} ms</Badge>
                  {r.truncated && <Badge tone="warning">truncated</Badge>}
                </div>
                <DataTable columns={r.columns} rows={r.rows} />
              </div>
            ))}
            {results.length === 0 && !error && (
              <div className="rounded-xl border border-dashed border-line-strong bg-surface/60">
                <EmptyState title="No results yet">
                  Run a statement to see rows, timing, and the command tag here.
                </EmptyState>
              </div>
            )}
          </div>
        </div>

        <SnippetRail onPick={setSql} />
      </div>
    </Shell>
  );
}
