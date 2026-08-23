import { ReactNode } from "react";

export default function SelectCard({
  selected,
  onSelect,
  title,
  description,
  icon,
  meta,
  disabled = false,
}: {
  selected: boolean;
  onSelect: () => void;
  title: string;
  description?: string;
  icon?: ReactNode;
  meta?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={`flex w-full items-start gap-3 rounded-xl border p-3.5 text-left transition-all duration-150 ease-apple disabled:opacity-40 ${
        selected
          ? "border-accent bg-accent-soft/40 ring-1 ring-accent"
          : "border-line bg-surface hover:border-line-strong hover:bg-surface-hover"
      }`}
    >
      {icon && <span className="mt-0.5 shrink-0">{icon}</span>}
      <span className="min-w-0 flex-1">
        <span className="flex items-center justify-between gap-2">
          <span className="truncate text-small font-semibold text-fg">{title}</span>
          {meta}
        </span>
        {description && <span className="mt-1 block text-caption leading-snug text-fg-muted">{description}</span>}
      </span>
    </button>
  );
}
