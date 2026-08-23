import type { CompletionSource } from "@/lib/types";
import { SQL_FUNCTIONS, SQL_KEYWORDS, SQL_TYPES } from "./keywords";

export type SuggestionKind = "keyword" | "type" | "table" | "column" | "schema" | "function";

export type Suggestion = {
  label: string;
  /** What actually gets inserted, which can differ from the label. */
  insert: string;
  kind: SuggestionKind;
  detail?: string;
};

/** The word being typed, and where it starts in the document. */
export type Token = { word: string; start: number };

const WORD = /[A-Za-z0-9_."]/;

/** Reads the identifier immediately before the caret. */
export function tokenAt(text: string, caret: number): Token {
  let start = caret;
  while (start > 0 && WORD.test(text[start - 1])) start -= 1;
  return { word: text.slice(start, caret), start };
}

/**
 * Ranks candidates against the typed prefix: exact prefix matches first, then
 * anything containing it. Case-insensitive, capped so the popup stays usable.
 */
export function rank(candidates: Suggestion[], word: string, limit = 12): Suggestion[] {
  const q = word.toLowerCase();
  if (!q) return candidates.slice(0, limit);

  const starts: Suggestion[] = [];
  const contains: Suggestion[] = [];
  for (const c of candidates) {
    const label = c.label.toLowerCase();
    if (label.startsWith(q)) starts.push(c);
    else if (label.includes(q)) contains.push(c);
  }
  return [...starts, ...contains].slice(0, limit);
}

/** Static candidates that do not depend on the connected database. */
function staticCandidates(): Suggestion[] {
  return [
    ...SQL_KEYWORDS.map((k) => ({ label: k, insert: k, kind: "keyword" as const })),
    ...SQL_TYPES.map((t) => ({ label: t, insert: t, kind: "type" as const })),
    ...SQL_FUNCTIONS.map((f) => ({
      label: f,
      insert: `${f}(`,
      kind: "function" as const,
      detail: "function",
    })),
  ];
}

/**
 * Builds the full candidate list for a database.
 *
 * When the typed word is qualified ("public.", "users."), only that prefix's
 * children are offered, which is what makes column completion feel targeted.
 */
export function candidatesFor(source: CompletionSource | null, word: string): Suggestion[] {
  if (!source) return staticCandidates();

  const dot = word.lastIndexOf(".");
  if (dot > 0) {
    const qualifier = word.slice(0, dot).replace(/"/g, "");
    const scoped = qualifiedCandidates(source, qualifier);
    if (scoped.length > 0) return scoped;
  }

  return [...tableCandidates(source), ...columnCandidates(source), ...schemaCandidates(source),
    ...functionCandidates(source), ...staticCandidates()];
}

function qualifiedCandidates(source: CompletionSource, qualifier: string): Suggestion[] {
  // "schema.table." or "table." -> that relation's columns.
  const keys = Object.keys(source.columns);
  const key =
    keys.find((k) => k === qualifier) ??
    keys.find((k) => k.split(".")[1] === qualifier && k.startsWith("public."));

  if (key) {
    return (source.columns[key] ?? []).map((c) => ({
      label: c,
      insert: c,
      kind: "column" as const,
      detail: key,
    }));
  }

  // "schema." -> that schema's relations.
  return source.relations
    .filter((r) => r.schema === qualifier)
    .map((r) => ({ label: r.name, insert: r.name, kind: "table" as const, detail: r.kind }));
}

function tableCandidates(source: CompletionSource): Suggestion[] {
  return source.relations.flatMap((r) => {
    const qualified = `${r.schema}.${r.name}`;
    const entry = { kind: "table" as const, detail: `${r.kind} in ${r.schema}` };
    return r.schema === "public"
      ? [{ label: r.name, insert: r.name, ...entry }, { label: qualified, insert: qualified, ...entry }]
      : [{ label: qualified, insert: qualified, ...entry }];
  });
}

function columnCandidates(source: CompletionSource): Suggestion[] {
  const seen = new Set<string>();
  const out: Suggestion[] = [];
  for (const [table, columns] of Object.entries(source.columns)) {
    for (const c of columns) {
      if (seen.has(c)) continue;
      seen.add(c);
      out.push({ label: c, insert: c, kind: "column", detail: table });
    }
  }
  return out;
}

function schemaCandidates(source: CompletionSource): Suggestion[] {
  return source.schemas.map((s) => ({ label: s, insert: s, kind: "schema" as const }));
}

function functionCandidates(source: CompletionSource): Suggestion[] {
  return source.functions.map((f) => ({
    label: f,
    insert: `${f}(`,
    kind: "function" as const,
    detail: "function",
  }));
}

/** Replaces the token under the caret, returning the new text and caret. */
export function applySuggestion(
  text: string,
  token: Token,
  caret: number,
  suggestion: Suggestion
): { text: string; caret: number } {
  // A qualified word keeps its prefix: "users.na" + "name" -> "users.name".
  const dot = token.word.lastIndexOf(".");
  const keep = dot >= 0 ? token.word.slice(0, dot + 1) : "";
  const replacement = keep + suggestion.insert;

  const next = text.slice(0, token.start) + replacement + text.slice(caret);
  return { text: next, caret: token.start + replacement.length };
}
