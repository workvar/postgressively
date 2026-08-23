import { api } from "./api";
import type { QueryResult, Table, TableDetail } from "./types";

function url(path: string, params: Record<string, string | undefined>) {
  const qs = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v) qs.set(k, v);
  }
  const s = qs.toString();
  return s ? `${path}?${s}` : path;
}

function tablePath(schema: string, table: string) {
  return `/api/tables/${encodeURIComponent(schema)}/${encodeURIComponent(table)}`;
}

export function fetchTables(db: string) {
  return api.get<Table[]>(url("/api/tables", { db }));
}

export function fetchTableSchema(db: string, schema: string, table: string) {
  return api.get<TableDetail>(url(tablePath(schema, table), { db }));
}

export function fetchTableRows(db: string, schema: string, table: string, limit = 100) {
  return api.get<QueryResult>(
    url(`${tablePath(schema, table)}/rows`, { db, limit: String(limit) })
  );
}
