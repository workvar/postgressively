"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { control } from "./Field";

export type ComboboxOption = {
  value: string;
  label: string;
  /** Secondary text shown under the label and included in the search. */
  hint?: string;
};

type Props = {
  options: ComboboxOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  emptyText?: string;
  disabled?: boolean;
  id?: string;
  "aria-label"?: string;
  className?: string;
};

function matches(o: ComboboxOption, q: string) {
  if (!q) return true;
  return `${o.label} ${o.value} ${o.hint ?? ""}`.toLowerCase().includes(q);
}

/**
 * Single-select dropdown with type-ahead filtering.
 * This is the project's standard picker: prefer it over a native <select>.
 */
export default function Combobox({
  options,
  value,
  onChange,
  placeholder = "Select…",
  emptyText = "No matches",
  disabled,
  id,
  "aria-label": ariaLabel,
  className = "",
}: Props) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);

  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  const selected = options.find((o) => o.value === value) ?? null;
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return options.filter((o) => matches(o, q));
  }, [options, query]);

  useEffect(() => {
    function onDocMouseDown(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, []);

  useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  useEffect(() => {
    setActive(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${active}"]`)
      ?.scrollIntoView({ block: "nearest" });
  }, [active, open]);

  function commit(option: ComboboxOption) {
    onChange(option.value);
    setOpen(false);
    inputRef.current?.blur();
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape") {
      setOpen(false);
      return;
    }
    if (e.key === "Tab") {
      setOpen(false);
      return;
    }
    if (!open && (e.key === "ArrowDown" || e.key === "Enter")) {
      setOpen(true);
      e.preventDefault();
      return;
    }
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, filtered.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const option = filtered[active];
      if (option) commit(option);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input
        ref={inputRef}
        id={id}
        role="combobox"
        aria-label={ariaLabel}
        aria-expanded={open}
        aria-controls={listId}
        aria-autocomplete="list"
        autoComplete="off"
        disabled={disabled}
        className={`${control} h-9 cursor-text pr-8`}
        placeholder={selected ? selected.label : placeholder}
        value={open ? query : selected?.label ?? ""}
        onChange={(e) => {
          setQuery(e.target.value);
          if (!open) setOpen(true);
        }}
        onMouseDown={() => !disabled && setOpen(true)}
        onKeyDown={onKeyDown}
      />

      <svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
        className={`pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-fg-subtle transition-transform duration-150 ease-apple ${
          open ? "rotate-180" : ""
        }`}
      >
        <path
          d="m6 8 4 4 4-4"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          className="animate-fadeUp absolute left-0 right-0 z-30 mt-1 max-h-64 overflow-y-auto rounded-xl border border-line bg-surface py-1 shadow-pop"
        >
          {filtered.map((o, i) => {
            const isActive = i === active;
            const isSelected = o.value === value;
            return (
              <li key={o.value}>
                <button
                  type="button"
                  role="option"
                  data-index={i}
                  aria-selected={isSelected}
                  onMouseEnter={() => setActive(i)}
                  onClick={() => commit(o)}
                  className={`flex w-full items-center gap-2 px-3 py-2 text-left transition-colors duration-100 ease-apple ${
                    isActive ? "bg-surface-hover" : ""
                  }`}
                >
                  <span className="min-w-0 flex-1">
                    <span
                      className={`block truncate text-small ${
                        isSelected ? "font-medium text-accent" : "text-fg"
                      }`}
                    >
                      {o.label}
                    </span>
                    {o.hint && (
                      <span className="block truncate text-micro text-fg-subtle">{o.hint}</span>
                    )}
                  </span>
                  {isSelected && <span className="shrink-0 text-caption text-accent">✓</span>}
                </button>
              </li>
            );
          })}

          {filtered.length === 0 && (
            <li className="px-3 py-2.5 text-small text-fg-subtle">{emptyText}</li>
          )}
        </ul>
      )}
    </div>
  );
}
