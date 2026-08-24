"use client";

import { useEffect, useMemo, useState } from "react";
import { EmptyState } from "@/components/ui/Panel";
import { applyRowChanges, toClipboardText } from "@/lib/rows";
import {
  buildGrid,
  changedColumns,
  countPending,
  primaryKeys,
  toChanges,
  type CellRef,
  type GridState,
} from "@/lib/grid/pending";
import type { ChangeResult, Column, QueryResult } from "@/lib/types";
import ChangeScript from "./ChangeScript";
import GridCell from "./GridCell";
import GridToolbar from "./GridToolbar";

/**
 * Spreadsheet view of a table's rows.
 *
 * Edits, inserts and deletes are collected locally and never touch the
 * database until the user reviews the generated script and confirms. Tables
 * without a primary key stay read-only, because there is no safe way to
 * address a single row, and so do engines the console has no row editor for.
 */
export default function DataGrid({
  db,
  schema,
  table,
  result,
  columns,
  onSaved,
  writable = true,
}: {
  db: string;
  schema: string;
  table: string;
  result: QueryResult;
  columns: Column[];
  onSaved: () => void;
  /** False on engines without a row editor, such as MySQL or SQLite. */
  writable?: boolean;
}) {
  const keys = useMemo(() => primaryKeys(columns), [columns]);
  const editable = writable && keys.length > 0;

  const [state, setState] = useState<GridState>(() =>
    buildGrid(columns, result.columns, result.rows)
  );
  const [selected, setSelected] = useState<CellRef | null>(null);
  const [editingCell, setEditingCell] = useState<CellRef | null>(null);
  const [reviewing, setReviewing] = useState(false);
  const [preview, setPreview] = useState<ChangeResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    setState(buildGrid(columns, result.columns, result.rows));
    setSelected(null);
    setEditingCell(null);
  }, [columns, result]);

  const pending = countPending(state);

  function updateRow(index: number, patch: (row: GridState["rows"][number]) => void) {
    setState((s) => {
      const rows = s.rows.slice();
      const row = { ...rows[index], values: { ...rows[index].values } };
      patch(row);
      rows[index] = row;
      return { ...s, rows };
    });
  }

  function addRow() {
    setState((s) => {
      const values: Record<string, unknown> = {};
      for (const c of s.columns) values[c.name] = null;
      return {
        ...s,
        nextNewId: s.nextNewId + 1,
        rows: [...s.rows, { id: `n${s.nextNewId}`, values, original: null, deleted: false }],
      };
    });
  }

  function toggleDelete() {
    if (!selected) return;
    updateRow(selected.row, (row) => {
      row.deleted = !row.deleted;
    });
  }

  async function copySelection() {
    const text = toClipboardText([
      result.columns,
      ...state.rows.filter((r) => !r.deleted).map((r) => result.columns.map((c) => r.values[c])),
    ]);
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      setError("Clipboard access was blocked by the browser.");
    }
  }

  async function review() {
    setBusy(true);
    setError(null);
    setPreview(null);
    setReviewing(true);
    try {
      const res = await applyRowChanges(db, schema, table, toChanges(state, keys), true);
      setPreview(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not check the changes");
    } finally {
      setBusy(false);
    }
  }

  async function apply() {
    setBusy(true);
    setError(null);
    try {
      await applyRowChanges(db, schema, table, toChanges(state, keys), false);
      setReviewing(false);
      setPreview(null);
      onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not apply the changes");
    } finally {
      setBusy(false);
    }
  }

  function discard() {
    setState(buildGrid(columns, result.columns, result.rows));
    setError(null);
  }

  if (result.columns.length === 0) {
    return <EmptyState>No columns returned.</EmptyState>;
  }

  return (
    // Masked from Microsoft Clarity: this is the operator's actual row
    // data. See web/lib/telemetry.ts.
    <div data-clarity-mask="true">
      <GridToolbar
        pending={pending}
        editable={editable}
        hasSelection={selected !== null}
        busy={busy}
        onAdd={addRow}
        onDelete={toggleDelete}
        onCopy={copySelection}
        onReview={review}
        onDiscard={discard}
      />

      {!editable && (
        <p className="mb-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2 text-caption text-fg-muted">
          This relation has no primary key, so rows cannot be edited safely. Use the SQL console
          for changes here.
        </p>
      )}
      {error && !reviewing && (
        <p className="mb-2.5 text-caption text-danger">{error}</p>
      )}

      <div className="overflow-auto rounded-xl border border-line bg-surface shadow-card">
        <table className="min-w-full border-collapse text-left">
          <thead className="sticky top-0 z-10">
            <tr>
              <th className="w-10 border-b border-r border-line bg-surface-2 px-2 py-1.5 text-micro font-semibold text-fg-subtle">
                #
              </th>
              {result.columns.map((name) => {
                const col = columns.find((c) => c.name === name);
                return (
                  <th
                    key={name}
                    className="whitespace-nowrap border-b border-r border-line bg-surface-2 px-2 py-1.5 text-micro font-semibold uppercase tracking-[0.06em] text-fg-subtle last:border-r-0"
                  >
                    {name}
                    {col?.isPrimaryKey && <span className="ml-1 text-accent">key</span>}
                    {col && (
                      <span className="ml-1.5 font-normal normal-case text-fg-subtle/70">
                        {col.type}
                      </span>
                    )}
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {state.rows.map((row, rowIndex) => {
              const dirty = new Set(row.original ? changedColumns(row) : []);
              return (
                <tr
                  key={row.id}
                  className={`transition-colors duration-100 ease-apple ${
                    row.deleted
                      ? "bg-danger-soft/60 line-through opacity-60"
                      : !row.original
                        ? "bg-success-soft/50"
                        : "hover:bg-surface-hover"
                  }`}
                >
                  <td className="border-b border-r border-line bg-surface-2 px-2 py-1.5 text-micro text-fg-subtle">
                    {rowIndex + 1}
                  </td>
                  {result.columns.map((name) => (
                    <GridCell
                      key={name}
                      value={row.values[name]}
                      readOnly={!editable}
                      changed={dirty.has(name)}
                      selected={selected?.row === rowIndex && selected.column === name}
                      editing={editingCell?.row === rowIndex && editingCell.column === name}
                      onSelect={() => setSelected({ row: rowIndex, column: name })}
                      onEdit={() => setEditingCell({ row: rowIndex, column: name })}
                      onCommit={() => setEditingCell(null)}
                      onCancel={() => setEditingCell(null)}
                      onChange={(v) =>
                        updateRow(rowIndex, (r) => {
                          r.values[name] = v;
                        })
                      }
                    />
                  ))}
                </tr>
              );
            })}
          </tbody>
        </table>
        {state.rows.length === 0 && <EmptyState>No rows.</EmptyState>}
      </div>

      <ChangeScript
        open={reviewing}
        preview={preview}
        error={error}
        busy={busy}
        onCancel={() => {
          setReviewing(false);
          setError(null);
        }}
        onApply={apply}
      />
    </div>
  );
}
