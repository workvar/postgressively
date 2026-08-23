import { api } from "./api";
import type { Database } from "./types";

export const fetchDatabases = () => api.get<Database[]>("/api/databases");

/** Picks the database a page should start on: the configured one, else the first. */
export function initialDatabase(list: Database[]): string {
  return (list.find((d) => d.isDefault) ?? list[0])?.name ?? "";
}
