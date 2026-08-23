import { ReactNode } from "react";

export default function Card({
  title,
  value,
  hint,
  badge,
}: {
  title: string;
  value: string;
  hint?: string;
  badge?: ReactNode;
}) {
  return (
    <div className="animate-fadeUp rounded-xl border border-line bg-surface p-3.5 shadow-card transition-shadow duration-200 ease-apple hover:shadow-raised">
      <div className="flex items-start justify-between gap-2">
        <span className="text-micro font-semibold uppercase tracking-[0.06em] text-fg-subtle">{title}</span>
        {badge}
      </div>
      <div className="mt-1.5 truncate text-[21px] font-semibold tracking-[-0.01em] text-fg">{value}</div>
      {hint && <div className="mt-0.5 truncate text-caption text-fg-muted">{hint}</div>}
    </div>
  );
}
