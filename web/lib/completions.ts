import { api } from "./api";
import type { CompletionSource } from "./types";

/**
 * Autocomplete metadata for the SQL console.
 *
 * The catalog scan is not free, so each database's result is cached for the
 * lifetime of the page. `invalidateCompletions` drops the cache after DDL.
 */
const cache = new Map<string, Promise<CompletionSource>>();

export function fetchCompletions(db: string): Promise<CompletionSource> {
  const key = db || "__default__";
  const hit = cache.get(key);
  if (hit) return hit;

  const request = api
    .get<CompletionSource>(db ? `/api/completions?db=${encodeURIComponent(db)}` : "/api/completions")
    .catch((e) => {
      cache.delete(key);
      throw e;
    });

  cache.set(key, request);
  return request;
}

export function invalidateCompletions(db?: string) {
  if (db === undefined) cache.clear();
  else cache.delete(db || "__default__");
}
