"use client";

import { useState } from "react";
import UriText from "@/components/ui/UriText";

function CopyButton({ value }: { value: string }) {
  const [done, setDone] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setDone(true);
      setTimeout(() => setDone(false), 1400);
    } catch {
      /* clipboard unavailable */
    }
  }

  return (
    <button
      onClick={copy}
      aria-label="Copy to clipboard"
      className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-fg-subtle transition-colors duration-150 ease-apple hover:bg-surface-2 hover:text-accent"
    >
      {done ? (
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4 text-success">
          <path d="M5 10.5l3.5 3.5L15 7" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      ) : (
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <rect x="7" y="7" width="9" height="9" rx="2" stroke="currentColor" strokeWidth="1.5" />
          <path d="M13 4.5H6A1.5 1.5 0 0 0 4.5 6v7" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      )}
    </button>
  );
}

export default function CopyRow({
  label,
  value,
  secret = false,
}: {
  label: string;
  value: string;
  secret?: boolean;
}) {
  const [revealed, setRevealed] = useState(false);
  const masked = secret && !revealed;

  return (
    <div className="flex items-center gap-3 border-b border-line px-4 py-2.5 last:border-0 hover:bg-surface-hover">
      <span className="w-40 shrink-0 text-small text-fg-muted">{label}</span>
      <span className="min-w-0 flex-1 truncate font-mono text-caption text-fg">
        {masked ? "•".repeat(12) : <UriText value={value} />}
      </span>
      {secret && (
        <button
          onClick={() => setRevealed((r) => !r)}
          aria-label={revealed ? "Hide value" : "Reveal value"}
          className="grid h-7 w-7 shrink-0 place-items-center rounded-md text-fg-subtle transition-colors duration-150 ease-apple hover:bg-surface-2 hover:text-accent"
        >
          <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
            <path d="M2 10s3-5 8-5 8 5 8 5-3 5-8 5-8-5-8-5Z" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="10" cy="10" r="2" stroke="currentColor" strokeWidth="1.5" />
            {revealed && <path d="M4 16 16 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />}
          </svg>
        </button>
      )}
      <CopyButton value={value} />
    </div>
  );
}
