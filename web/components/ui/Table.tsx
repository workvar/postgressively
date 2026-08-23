import { ReactNode } from "react";

export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto rounded-xl border border-line bg-surface shadow-card">{children}</div>;
}

export function Table({ children }: { children: ReactNode }) {
  return <table className="min-w-full border-collapse text-left text-small">{children}</table>;
}

export function Th({ children, className = "" }: { children?: ReactNode; className?: string }) {
  return (
    <th
      className={`whitespace-nowrap border-b border-line bg-surface-2 px-3 py-2 text-micro font-semibold uppercase tracking-[0.06em] text-fg-subtle ${className}`}
    >
      {children}
    </th>
  );
}

export function Tr({ children }: { children: ReactNode }) {
  return (
    <tr className="border-b border-line/70 transition-colors duration-100 ease-apple last:border-0 hover:bg-surface-hover">
      {children}
    </tr>
  );
}

export function Td({ children, className = "" }: { children: ReactNode; className?: string }) {
  return <td className={`px-3 py-2 align-middle text-fg ${className}`}>{children}</td>;
}

export const mono = "font-mono text-caption";
