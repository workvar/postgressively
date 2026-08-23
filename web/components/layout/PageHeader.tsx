import { ReactNode } from "react";

export default function PageHeader({
  title,
  description,
  meta,
  action,
}: {
  title: string;
  description?: string;
  meta?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
      <div className="min-w-0">
        <h1 className="text-title text-fg">{title}</h1>
        {description && <p className="mt-1 max-w-[70ch] text-small text-fg-muted">{description}</p>}
        {meta && <div className="mt-2.5 flex flex-wrap items-center gap-1.5">{meta}</div>}
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
