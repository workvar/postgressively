import { api } from "./api";
import type { ChangeResult, RowChange } from "./types";

function rowsPath(db: string, schema: string, table: string) {
  const path = `/api/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}/rows`;
  return db ? `${path}?db=${encodeURIComponent(db)}` : path;
}

/**
 * Sends the grid's pending edits.
 *
 * A dry run returns the exact script the commit would execute, and is rolled
 * back afterwards, so the preview the user approves is what actually runs.
 * Batches containing deletes prompt for step-up confirmation automatically.
 */
export function applyRowChanges(
  db: string,
  schema: string,
  table: string,
  changes: RowChange[],
  dryRun: boolean
) {
  return api.post<ChangeResult>(
    rowsPath(db, schema, table),
    { changes, dryRun },
    { reason: "Saving these changes will delete rows." }
  );
}

/** Copies a block of cells as tab-separated text, which pastes into a spreadsheet. */
export function toClipboardText(rows: unknown[][]): string {
  return rows
    .map((row) => row.map((v) => (v === null || v === undefined ? "" : String(v))).join("\t"))
    .join("\n");
}
