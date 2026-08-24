"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import Parallax, { TiltCard } from "@/components/motion/Parallax";
import Reveal, { Stagger } from "@/components/motion/Reveal";
import Button from "@/components/ui/Button";

const PILLS = [
  "SQL console",
  "Schema browser",
  "Passkeys",
  "Multi-engine",
  "Self-hosted",
  "Row editor",
];

export default function Hero() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  return (
    <section className="relative overflow-hidden px-5 pb-24 pt-20 md:pb-32 md:pt-28">
      {/* Ambient orbs */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div className="absolute -left-32 top-0 h-[480px] w-[480px] rounded-full bg-[var(--orb-1)] blur-[100px]" />
        <div className="absolute -right-24 top-32 h-[360px] w-[360px] rounded-full bg-[var(--orb-2)] blur-[90px]" />
        <div className="absolute left-1/2 top-0 h-[520px] w-[720px] -translate-x-1/2 bg-[radial-gradient(ellipse_80%_50%_at_50%_-20%,var(--hero-glow),transparent)]" />
      </div>

      <div className="relative mx-auto max-w-6xl">
        <div className="mx-auto max-w-4xl text-center">
          <Reveal direction="blur" delay={0}>
            <p className="text-sm font-medium tracking-wide text-accent">Self-hosted database console</p>
          </Reveal>

          <Reveal direction="up" delay={80}>
            <h1 className="mt-5 text-hero md:text-display">
              <span className="text-gradient">Postgres control,</span>
              <br />
              <span className="font-serif text-[1.08em] font-normal italic text-fg-muted">
                without leaving the browser
              </span>
            </h1>
          </Reveal>

          <Reveal direction="up" delay={160}>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-fg-muted md:text-xl md:leading-relaxed">
              Browse schemas, run queries, manage backups, and connect MySQL, SQLite, and SQL Server — from a
              console you host on your own infrastructure.
            </p>
          </Reveal>

          <Reveal direction="up" delay={240}>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-3">
              <Button href="/download" variant="primary">
                Download latest
                <ArrowIcon />
              </Button>
              <Button href="https://github.com/workvar/postgressively" external variant="secondary">
                View on GitHub
              </Button>
            </div>
          </Reveal>

          {mounted && (
            <Stagger
              className="mt-12 flex flex-wrap items-center justify-center gap-2"
              stagger={60}
              direction="scale"
            >
              {PILLS.map((pill, i) => (
                <span
                  key={pill}
                  className={`rounded-pill border border-line/80 bg-surface/70 px-3.5 py-1.5 text-xs font-medium text-fg-muted shadow-panel backdrop-blur pill-float ${i % 3 === 1 ? "pill-float-delay-1" : i % 3 === 2 ? "pill-float-delay-2" : ""}`}
                >
                  {pill}
                </span>
              ))}
            </Stagger>
          )}
        </div>

        <Reveal direction="scale" delay={320} threshold={0.05}>
          <Parallax strength={28} className="relative mx-auto mt-16 max-w-5xl md:mt-20">
            <TiltCard>
              <div className="shine-border rounded-3xl p-px shadow-float">
                <ProductMockup />
              </div>
            </TiltCard>
          </Parallax>
        </Reveal>
      </div>
    </section>
  );
}

function ArrowIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden>
      <path
        d="M3 8h10M9 4l4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function ProductMockup() {
  return (
    <div className="overflow-hidden rounded-[23px] bg-surface">
      <div className="overflow-hidden bg-[var(--mock-bg)]">
        <div className="flex items-center gap-2 border-b border-line px-4 py-3.5">
          <span className="h-2.5 w-2.5 rounded-full bg-[#ff5f57]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#febc2e]" />
          <span className="h-2.5 w-2.5 rounded-full bg-[#28c840]" />
          <span className="ml-3 font-mono text-[11px] text-fg-subtle">postggresively · overview</span>
        </div>
        <div className="grid md:grid-cols-[200px_1fr]">
          <aside className="hidden border-r border-line p-4 md:block">
            {["Overview", "SQL console", "Databases", "Connections", "Server"].map((item, i) => (
              <div
                key={item}
                className={`mb-1 rounded-lg px-3 py-2 text-xs transition-colors ${i === 0 ? "bg-accent-soft font-medium text-accent" : "text-fg-muted"}`}
              >
                {item}
              </div>
            ))}
          </aside>
          <div className="p-5 md:p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-fg">postgresql</p>
                <p className="text-xs text-fg-subtle">localhost:5432 · active</p>
              </div>
              <span className="rounded-pill bg-accent-soft px-2.5 py-0.5 text-xs font-medium text-accent">
                4 databases
              </span>
            </div>
            <div className="mt-5 grid grid-cols-2 gap-2.5 sm:grid-cols-4">
              {[
                { label: "Service", value: "active" },
                { label: "Version", value: "16.2" },
                { label: "Databases", value: "4" },
                { label: "Total size", value: "2.4 GB" },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border border-line bg-surface p-3">
                  <p className="text-[10px] uppercase tracking-wider text-fg-subtle">{card.label}</p>
                  <p className="mt-1 text-sm font-medium tabular-nums text-fg">{card.value}</p>
                </div>
              ))}
            </div>
            <div className="mt-5 overflow-hidden rounded-xl border border-line">
              <div className="border-b border-line bg-surface/50 px-3 py-2.5 text-xs font-medium text-fg-muted">
                Active connections
              </div>
              <div className="divide-y divide-line">
                {[
                  ["app_api", "SELECT", "12 ms"],
                  ["worker", "idle", "—"],
                  ["migration", "ALTER TABLE", "340 ms"],
                ].map(([app, state, dur]) => (
                  <div key={app} className="flex items-center justify-between px-3 py-2.5 text-xs">
                    <span className="font-medium text-fg">{app}</span>
                    <span className="text-fg-muted">{state}</span>
                    <span className="tabular-nums text-fg-subtle">{dur}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
