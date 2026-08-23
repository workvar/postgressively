import { ReactNode } from "react";
import { LogoMark } from "@/components/brand/Logo";
import Badge, { toneForState } from "@/components/ui/Badge";

/** Aiven-style service identity bar: avatar, name, status pills, actions. */
export default function ServiceHeader({
  name,
  version,
  status,
  extra,
  action,
}: {
  name: string;
  version: string;
  status: string;
  extra?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
      <div className="flex min-w-0 items-center gap-3">
        <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border border-line bg-surface-2">
          <LogoMark size={22} />
        </span>
        <div className="min-w-0">
          <h1 className="truncate text-[19px] font-semibold tracking-[-0.01em] text-fg">{name}</h1>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{version}</Badge>
            <Badge tone={toneForState(status)} dot>
              {status}
            </Badge>
            {extra}
          </div>
        </div>
      </div>
      {action && <div className="flex flex-wrap items-center gap-2">{action}</div>}
    </div>
  );
}
