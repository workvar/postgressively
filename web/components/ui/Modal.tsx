"use client";

import { ReactNode, useEffect } from "react";

/** Centred dialog with a scrim. Escape and scrim clicks call onClose. */
export default function Modal({
  open,
  title,
  description,
  onClose,
  children,
  footer,
}: {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
  footer?: ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div
      role="presentation"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
      className="fixed inset-0 z-50 grid place-items-center bg-black/40 px-4 backdrop-blur-sm"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="animate-fadeUp w-full max-w-[420px] overflow-hidden rounded-xl border border-line bg-surface shadow-pop"
      >
        <header className="border-b border-line px-4 py-3">
          <h2 className="text-subtitle text-fg">{title}</h2>
          {description && <p className="mt-0.5 text-caption text-fg-muted">{description}</p>}
        </header>
        <div className="p-4">{children}</div>
        {footer && (
          <footer className="flex items-center justify-end gap-2 border-t border-line bg-surface-2 px-4 py-3">
            {footer}
          </footer>
        )}
      </div>
    </div>
  );
}
