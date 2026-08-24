"use client";

import { KeyboardEvent, useMemo, useRef, useState } from "react";
import { Textarea } from "@/components/ui/Field";
import { applySuggestion, candidatesFor, rank, tokenAt } from "@/lib/sql/complete";
import type { Suggestion } from "@/lib/sql/complete";
import type { CompletionSource } from "@/lib/types";
import SuggestionList from "./SuggestionList";
import { caretPosition } from "./caret";

/**
 * SQL textarea with identifier and keyword type-ahead.
 *
 * Suggestions open as you type a word and are driven by the live catalog of
 * the selected database, so table and column names are always current. Enter
 * or Tab accepts, Escape dismisses, and ⌘/Ctrl+Enter runs the statement.
 */
export default function SqlEditor({
  value,
  onChange,
  onRun,
  source,
  rows = 12,
}: {
  value: string;
  onChange: (sql: string) => void;
  onRun: () => void;
  source: CompletionSource | null;
  rows?: number;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const [caret, setCaret] = useState(0);
  const [position, setPosition] = useState({ top: 0, left: 0 });

  const token = useMemo(() => tokenAt(value, caret), [value, caret]);
  const items = useMemo(
    () => (open ? rank(candidatesFor(source, token.word), suffixOf(token.word)) : []),
    [open, source, token.word]
  );

  function refresh(nextCaret: number, show: boolean) {
    setCaret(nextCaret);
    setActive(0);
    if (ref.current) setPosition(caretPosition(ref.current, nextCaret));
    setOpen(show);
  }

  function handleChange(next: string, nextCaret: number) {
    onChange(next);
    const word = tokenAt(next, nextCaret).word;
    refresh(nextCaret, word.length > 0);
  }

  function accept(suggestion: Suggestion) {
    const result = applySuggestion(value, token, caret, suggestion);
    onChange(result.text);
    setOpen(false);
    requestAnimationFrame(() => {
      const el = ref.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(result.caret, result.caret);
      setCaret(result.caret);
    });
  }

  function onKeyDown(e: KeyboardEvent<HTMLTextAreaElement>) {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      setOpen(false);
      onRun();
      return;
    }
    // Ctrl+Space opens the list on demand, even mid-word.
    if (e.ctrlKey && e.key === " ") {
      e.preventDefault();
      refresh(e.currentTarget.selectionStart, true);
      return;
    }

    if (!open || items.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % items.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i - 1 + items.length) % items.length);
    } else if (e.key === "Enter" || e.key === "Tab") {
      e.preventDefault();
      accept(items[active]);
    } else if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    }
  }

  return (
    // Masked from Microsoft Clarity: query text can contain anything the
    // operator's schema or data does. See web/lib/telemetry.ts.
    <div className="relative" data-clarity-mask="true">
      <Textarea
        ref={ref}
        value={value}
        rows={rows}
        spellCheck={false}
        aria-label="SQL statement"
        autoComplete="off"
        className="!rounded-none !border-0 !bg-transparent font-mono !text-caption"
        onChange={(e) => handleChange(e.target.value, e.target.selectionStart)}
        onKeyDown={onKeyDown}
        onClick={(e) => refresh(e.currentTarget.selectionStart, false)}
        onBlur={() => setOpen(false)}
      />
      {open && (
        <SuggestionList
          items={items}
          active={active}
          position={position}
          onPick={accept}
          onHover={setActive}
        />
      )}
    </div>
  );
}

/** The part of a qualified word after the last dot, which is what we match on. */
function suffixOf(word: string): string {
  const dot = word.lastIndexOf(".");
  return dot >= 0 ? word.slice(dot + 1) : word;
}
