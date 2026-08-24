import { ReactNode } from "react";

export default function Panel({
  title,
  description,
  action,
  children,
  padded = true,
  tint = false,
  id,
}: {
  title?: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  padded?: boolean;
  tint?: boolean;
  id?: string;
}) {
  return (
    <section
      id={id}
      className="animate-fadeUp scroll-mt-20 overflow-hidden rounded-xl border border-line bg-surface shadow-card"
    >
      {(title || action) && (
        <header
          className={`flex flex-wrap items-center justify-between gap-3 border-b border-line px-4 py-3 ${
            tint ? "bg-surface-2" : ""
          }`}
        >
          <div className="min-w-0">
            {title && <h2 className="text-subtitle text-fg">{title}</h2>}
            {description && <p className="mt-0.5 text-caption text-fg-muted">{description}</p>}
          </div>
          {action}
        </header>
      )}
      <div className={padded ? "p-4" : ""}>{children}</div>
    </section>
  );
}

export function EmptyState({ title, children }: { title?: string; children?: ReactNode }) {
  return (
    <div className="px-4 py-10 text-center">
      {title && <p className="text-subtitle text-fg">{title}</p>}
      {children && <p className="mt-1 text-small text-fg-muted">{children}</p>}
    </div>
  );
}

export function ErrorNote({ children }: { children: ReactNode }) {
  return (
    <p className="mb-4 flex items-start gap-2 rounded-lg border border-danger/25 bg-danger-soft px-3 py-2.5 text-small text-danger">
      <span aria-hidden>⚠</span>
      <span>{children}</span>
    </p>
  );
}

export function SectionTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-baseline justify-between gap-3">
      <h2 className="text-subtitle text-fg">{children}</h2>
      {action}
    </div>
  );
}
