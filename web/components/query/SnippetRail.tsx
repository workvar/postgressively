"use client";

const snippets: [string, string][] = [
  ["Server version", "SELECT version();"],
  [
    "Database sizes",
    "SELECT datname, pg_size_pretty(pg_database_size(datname)) AS size\nFROM pg_database\nORDER BY pg_database_size(datname) DESC;",
  ],
  [
    "Biggest tables",
    "SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS size\nFROM pg_catalog.pg_statio_user_tables\nORDER BY pg_total_relation_size(relid) DESC\nLIMIT 20;",
  ],
  [
    "Long-running queries",
    "SELECT pid, now() - query_start AS runtime, state, query\nFROM pg_stat_activity\nWHERE state <> 'idle'\nORDER BY runtime DESC;",
  ],
  [
    "Unused indexes",
    "SELECT relname, indexrelname, idx_scan\nFROM pg_stat_user_indexes\nWHERE idx_scan = 0\nORDER BY relname;",
  ],
];

export default function SnippetRail({ onPick }: { onPick: (sql: string) => void }) {
  return (
    <aside className="h-fit rounded-xl border border-line bg-surface p-3 shadow-card">
      <h2 className="mb-2 text-caption font-semibold uppercase tracking-[0.06em] text-fg-subtle">
        Snippets
      </h2>
      <ul className="space-y-1">
        {snippets.map(([label, body]) => (
          <li key={label}>
            <button
              onClick={() => onPick(body)}
              className="w-full rounded-lg px-2.5 py-2 text-left text-small text-fg-muted transition-colors duration-150 ease-apple hover:bg-surface-2 hover:text-fg"
            >
              {label}
            </button>
          </li>
        ))}
      </ul>
      <p className="mt-3 border-t border-line pt-3 text-micro leading-relaxed text-fg-subtle">
        Type to see table and column suggestions. Ctrl+Space opens them on demand, Tab accepts,
        ⌘/Ctrl+Enter runs.
      </p>
    </aside>
  );
}
