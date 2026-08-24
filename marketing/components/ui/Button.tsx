import Link from "next/link";
import { type ReactNode } from "react";

type Variant = "primary" | "secondary" | "ghost" | "accent";

const styles: Record<Variant, string> = {
  primary:
    "bg-fg text-canvas shadow-[0_1px_0_rgba(255,255,255,0.08)_inset,0_8px_24px_rgba(0,0,0,0.18)] hover:brightness-110 active:scale-[0.98]",
  secondary:
    "border border-line bg-surface/80 text-fg backdrop-blur hover:bg-surface-2 active:scale-[0.98]",
  ghost: "text-fg-muted hover:text-fg hover:bg-surface-2 active:scale-[0.98]",
  accent:
    "bg-accent text-white shadow-[0_1px_0_rgba(255,255,255,0.12)_inset,0_12px_32px_var(--accent-glow-strong)] hover:bg-accent-hover active:scale-[0.98]",
};

export default function Button({
  href,
  external,
  variant = "primary",
  className = "",
  children,
}: {
  href: string;
  external?: boolean;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}) {
  const cls = `btn-premium inline-flex items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-medium transition-[transform,background-color,box-shadow,filter] duration-200 ease-out ${styles[variant]} ${className}`;

  if (external) {
    return (
      <a href={href} target="_blank" rel="noopener noreferrer" className={cls}>
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={cls}>
      {children}
    </Link>
  );
}
