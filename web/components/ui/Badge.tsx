import { ReactNode } from "react";

export type Tone = "neutral" | "success" | "danger" | "warning" | "accent" | "info";

const tones: Record<Tone, string> = {
  neutral: "bg-surface-2 text-fg-muted border-line",
  success: "bg-success-soft text-success border-success/20",
  danger: "bg-danger-soft text-danger border-danger/20",
  warning: "bg-warning-soft text-warning border-warning/20",
  accent: "bg-accent-soft text-accent border-accent/20",
  info: "bg-info-soft text-info border-info/20",
};

export function toneForState(state?: string | null): Tone {
  const s = (state ?? "").toLowerCase();
  if (["active", "running", "enabled", "ok", "healthy"].some((k) => s.includes(k))) return "success";
  if (["fail", "dead", "error", "inactive", "stopped", "disabled"].some((k) => s.includes(k))) return "danger";
  if (["idle", "wait", "rebuild", "starting", "pending"].some((k) => s.includes(k))) return "warning";
  return "neutral";
}

export default function Badge({
  children,
  tone = "neutral",
  dot = false,
  icon,
}: {
  children: ReactNode;
  tone?: Tone;
  dot?: boolean;
  icon?: ReactNode;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-pill border px-2 py-0.5 text-caption font-medium ${tones[tone]}`}
    >
      {dot && <span className="h-1.5 w-1.5 rounded-full bg-current" />}
      {icon}
      {children}
    </span>
  );
}
