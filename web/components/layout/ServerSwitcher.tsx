"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import {
  activeConnection,
  onConnectionChange,
  setActiveConnection,
} from "@/lib/activeConnection";
import { fetchConnections, type Connection } from "@/lib/connections";
import { serverList, type ServerConnection } from "@/lib/servers";
import type { AgentStatus } from "@/lib/types";

function StatusDot({ status }: { status: string }) {
  const ok =
    status.toLowerCase().includes("active") ||
    status.toLowerCase().includes("running") ||
    status.toLowerCase().includes("connected");
  return <span className={`h-2 w-2 shrink-0 rounded-full ${ok ? "bg-success" : "bg-fg-subtle"}`} />;
}

export default function ServerSwitcher({ collapsed }: { collapsed: boolean }) {
  const [open, setOpen] = useState(false);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [saved, setSaved] = useState<Connection[]>([]);
  const [active, setActive] = useState(activeConnection());
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setActive(activeConnection());
    return onConnectionChange(setActive);
  }, []);

  useEffect(() => {
    api.get<AgentStatus>("/api/agent/status").then(setStatus).catch(() => setStatus(null));
    fetchConnections().then(setSaved).catch(() => setSaved([]));
  }, []);

  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, []);

  const servers: ServerConnection[] = serverList(status, saved, active);
  const current = servers.find((s) => s.current) ?? servers[0];

  function choose(id: string) {
    setActiveConnection(id);
    setOpen(false);
    // Pages read their data on mount, so reload to re-fetch against the
    // newly selected connection.
    window.location.reload();
  }

  return (
    <div ref={ref} className="relative px-3 pt-3">
      <button
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="listbox"
        aria-expanded={open}
        title={collapsed ? current.name : undefined}
        className={`flex w-full items-center gap-2 rounded-lg border border-line bg-surface-2 transition-colors duration-150 ease-apple hover:border-line-strong ${
          collapsed ? "justify-center p-2" : "px-2.5 py-2"
        }`}
      >
        <span className="grid h-6 w-6 shrink-0 place-items-center rounded-md bg-accent text-micro font-bold text-white">
          {current.name.charAt(0)}
        </span>
        {!collapsed && (
          <>
            <span className="min-w-0 flex-1 text-left">
              <span className="block truncate text-small font-medium text-fg">{current.name}</span>
              <span className="block truncate text-micro text-fg-subtle">{current.endpoint}</span>
            </span>
            <StatusDot status={current.status} />
            <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5 shrink-0 text-fg-subtle">
              <path
                d="m6 8 4 4 4-4"
                stroke="currentColor"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </>
        )}
      </button>

      {open && !collapsed && (
        <div
          role="listbox"
          className="animate-fadeUp absolute left-3 right-3 z-30 mt-1.5 overflow-hidden rounded-xl border border-line bg-surface shadow-pop"
        >
          <p className="border-b border-line px-3 py-2 text-micro font-semibold uppercase tracking-[0.08em] text-fg-subtle">
            Connected databases
          </p>
          {servers.map((s) => (
            <button
              key={s.id}
              role="option"
              aria-selected={s.current}
              onClick={() => choose(s.id)}
              className="flex w-full items-center gap-2.5 px-3 py-2.5 text-left transition-colors duration-150 ease-apple hover:bg-surface-hover"
            >
              <StatusDot status={s.status} />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-small font-medium text-fg">{s.name}</span>
                <span className="block truncate text-micro text-fg-subtle">
                  {s.kind} · {s.endpoint}
                </span>
              </span>
              {s.current && <span className="text-caption text-accent">✓</span>}
            </button>
          ))}

          <div className="border-t border-line p-2">
            <Link
              href="/connections"
              onClick={() => setOpen(false)}
              className="flex w-full items-center gap-2 rounded-lg px-2.5 py-2 text-small text-fg-muted transition-colors duration-150 ease-apple hover:bg-surface-2 hover:text-fg"
            >
              <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
                <path d="M10 4.5v11M4.5 10h11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              Add connection
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
