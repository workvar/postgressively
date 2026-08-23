"use client";

import type { Suggestion, SuggestionKind } from "@/lib/sql/complete";

const glyphs: Record<SuggestionKind, string> = {
  keyword: "K",
  type: "T",
  table: "▤",
  column: "▸",
  schema: "◇",
  function: "ƒ",
};

/** Popup rendered under the caret while typing in the SQL editor. */
export default function SuggestionList({
  items,
  active,
  position,
  onPick,
  onHover,
}: {
  items: Suggestion[];
  active: number;
  position: { top: number; left: number };
  onPick: (s: Suggestion) => void;
  onHover: (index: number) => void;
}) {
  if (items.length === 0) return null;

  return (
    <ul
      role="listbox"
      aria-label="SQL suggestions"
      style={{ top: position.top, left: position.left }}
      className="animate-fadeUp absolute z-40 max-h-60 w-[280px] overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-pop"
    >
      {items.map((s, i) => (
        <li key={`${s.kind}:${s.label}`}>
          <button
            type="button"
            role="option"
            aria-selected={i === active}
            data-index={i}
            onMouseEnter={() => onHover(i)}
            onMouseDown={(e) => {
              // Keep focus in the textarea so the caret does not jump.
              e.preventDefault();
              onPick(s);
            }}
            className={`flex w-full items-center gap-2 px-2.5 py-1.5 text-left transition-colors duration-100 ease-apple ${
              i === active ? "bg-surface-hover" : ""
            }`}
          >
            <span className="grid h-5 w-5 shrink-0 place-items-center rounded-md bg-surface-2 text-micro text-fg-subtle">
              {glyphs[s.kind]}
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate font-mono text-caption text-fg">{s.label}</span>
              {s.detail && (
                <span className="block truncate text-micro text-fg-subtle">{s.detail}</span>
              )}
            </span>
          </button>
        </li>
      ))}
    </ul>
  );
}
