import type { Column, RowChange } from "@/lib/types";

/** A cell address inside the grid: row index plus column name. */
export type CellRef = { row: number; column: string };

/** One row as the grid holds it, including rows the user just added. */
export type GridRow = {
  /** Stable key. Existing rows use "r<index>", new rows "n<counter>". */
  id: string;
  values: Record<string, unknown>;
  /** Values as loaded, used to build the WHERE clause and to detect real edits. */
  original: Record<string, unknown> | null;
  deleted: boolean;
};

export type GridState = {
  columns: Column[];
  rows: GridRow[];
  nextNewId: number;
};

/** Builds the initial grid state from a query result. */
export function buildGrid(columns: Column[], names: string[], rows: unknown[][]): GridState {
  return {
    columns,
    rows: rows.map((row, i) => {
      const values: Record<string, unknown> = {};
      names.forEach((name, j) => {
        values[name] = row[j];
      });
      return { id: `r${i}`, values, original: { ...values }, deleted: false };
    }),
    nextNewId: 0,
  };
}

export const primaryKeys = (columns: Column[]) =>
  columns.filter((c) => c.isPrimaryKey).map((c) => c.name);

/** True when a row has an edit, an insert, or a delete waiting to be saved. */
export function isDirty(row: GridRow): boolean {
  if (row.deleted) return true;
  if (!row.original) return true;
  return changedColumns(row).length > 0;
}

export function changedColumns(row: GridRow): string[] {
  if (!row.original) return Object.keys(row.values);
  return Object.keys(row.values).filter((k) => !sameValue(row.values[k], row.original?.[k]));
}

function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || a === undefined) return b === null || b === undefined;
  return String(a) === String(b);
}

/**
 * Turns the grid's pending state into the change list the backend applies.
 *
 * Rows that were added and then deleted never existed on the server, so they
 * are dropped rather than sent as a delete.
 */
export function toChanges(state: GridState, keys: string[]): RowChange[] {
  const out: RowChange[] = [];

  for (const row of state.rows) {
    if (!row.original) {
      if (row.deleted) continue;
      out.push({ kind: "insert", values: definedOnly(row.values) });
      continue;
    }
    if (row.deleted) {
      out.push({ kind: "delete", key: keyOf(row, keys) });
      continue;
    }
    const changed = changedColumns(row);
    if (changed.length === 0) continue;

    const values: Record<string, unknown> = {};
    for (const c of changed) values[c] = row.values[c];
    out.push({ kind: "update", key: keyOf(row, keys), values });
  }

  return out;
}

function keyOf(row: GridRow, keys: string[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const k of keys) out[k] = row.original?.[k] ?? row.values[k];
  return out;
}

/** Drops undefined and empty entries so inserts fall back to column defaults. */
function definedOnly(values: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(values)) {
    if (v === undefined || v === "") continue;
    out[k] = v;
  }
  return out;
}

export function countPending(state: GridState) {
  let inserts = 0;
  let updates = 0;
  let deletes = 0;
  for (const row of state.rows) {
    if (!row.original) {
      if (!row.deleted) inserts += 1;
    } else if (row.deleted) deletes += 1;
    else if (changedColumns(row).length > 0) updates += 1;
  }
  return { inserts, updates, deletes, total: inserts + updates + deletes };
}
