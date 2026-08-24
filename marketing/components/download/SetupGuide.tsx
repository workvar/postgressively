"use client";

import { useEffect, useMemo, useState } from "react";
import { METHOD_META, OS_META } from "@/components/icons/SetupIcons";
import Reveal from "@/components/motion/Reveal";
import {
  detectSetupOS,
  getSetupGuide,
  isMethodAvailable,
  type SetupMethod,
  type SetupOS,
} from "@/lib/setup-guides";
import {
  GITHUB_LATEST_API,
  GITHUB_RELEASES_PAGE,
  headlessDownloadFor,
  type HeadlessVariant,
} from "@/lib/headless-download";

const OS_ORDER: SetupOS[] = ["windows", "macos", "linux", "rpi"];
const METHOD_ORDER: SetupMethod[] = ["docker", "pm2", "systemd"];

export default function SetupGuide() {
  const [os, setOs] = useState<SetupOS>("linux");
  const [method, setMethod] = useState<SetupMethod>("docker");

  useEffect(() => {
    setOs(detectSetupOS());
  }, []);

  const guide = useMemo(() => getSetupGuide(method, os), [method, os]);
  const comboAvailable = isMethodAvailable(method, os);

  return (
    <section id="setup" className="mt-24 border-t border-line pt-20 md:mt-32 md:pt-28">
      <Reveal direction="up">
        <div className="mb-10">
          <p className="text-sm font-medium text-accent">Installation</p>
          <h2 className="mt-3 text-section text-fg md:text-hero">
            How to install on{" "}
            <span className="font-serif italic text-fg-muted">your device</span>
          </h2>
          <p className="mt-4 max-w-3xl text-base leading-relaxed text-fg-muted">
            Select your platform and deploy method. All paths finish at the first-run wizard at{" "}
            <code className="rounded bg-surface-2 px-1.5 py-0.5 text-sm text-fg">/setup</code>.
          </p>
        </div>
      </Reveal>

      <Reveal direction="up" delay={80}>
        <div className="space-y-6">
          {/* Step 1 — Platform */}
          <div className="rounded-2xl border border-line bg-surface p-5 md:p-6">
            <StepLabel n={1} title="Choose your platform" />
            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
              {OS_ORDER.map((id) => {
                const { label, Icon, color } = OS_META[id];
                const active = os === id;
                const ok = isMethodAvailable(method, id);
                return (
                  <button
                    key={id}
                    type="button"
                    onClick={() => setOs(id)}
                    className={`flex items-center gap-3 rounded-xl border px-3 py-3 text-left transition-all duration-200 ${
                      active
                        ? "border-accent bg-accent-soft ring-1 ring-accent/30"
                        : "border-line bg-canvas hover:border-accent/30 hover:bg-surface-2"
                    } ${!ok && !active ? "opacity-55" : ""}`}
                  >
                    <span
                      className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-surface-2"
                      style={{ color }}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <span className="min-w-0">
                      <span className="block text-sm font-medium leading-tight text-fg">{label}</span>
                      {!ok && (
                        <span className="mt-0.5 block text-[11px] text-fg-subtle">Limited methods</span>
                      )}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 2 — Method */}
          <div className="rounded-2xl border border-line bg-surface p-5 md:p-6">
            <StepLabel n={2} title="Choose install method" />
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              {METHOD_ORDER.map((id) => {
                const { label, hint, Icon, color } = METHOD_META[id];
                const active = method === id;
                const ok = isMethodAvailable(id, os);
                return (
                  <button
                    key={id}
                    type="button"
                    disabled={!ok}
                    onClick={() => setMethod(id)}
                    className={`relative rounded-xl border p-4 text-left transition-all duration-200 ${
                      active
                        ? "border-accent bg-accent-soft ring-1 ring-accent/30"
                        : ok
                          ? "border-line bg-canvas hover:border-accent/30 hover:bg-surface-2"
                          : "cursor-not-allowed border-line/60 bg-canvas/50 opacity-50"
                    }`}
                  >
                    <span
                      className="flex h-10 w-10 items-center justify-center rounded-xl bg-surface-2"
                      style={{ color: ok ? color : undefined }}
                    >
                      <Icon className="h-5 w-5" aria-hidden />
                    </span>
                    <p className="mt-3 text-sm font-semibold text-fg">{label}</p>
                    <p className="mt-0.5 text-xs text-fg-muted">{hint}</p>
                    {!ok && (
                      <p className="mt-2 text-[11px] font-medium text-fg-subtle">
                        Not on {OS_META[os].label}
                      </p>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Step 3 — Instructions */}
          <div className="rounded-2xl border border-line bg-surface p-5 md:p-8">
            <StepLabel
              n={3}
              title={
                comboAvailable
                  ? `${METHOD_META[method].label} on ${OS_META[os].label}`
                  : "Pick a supported combination"
              }
            />

            <div className="mt-6" key={`${method}-${os}`}>
              {!comboAvailable ? (
                <EmptyCombo os={os} method={method} onPick={setMethod} />
              ) : (
                <GuideBody guide={guide} method={method} os={os} />
              )}
            </div>
          </div>
        </div>
      </Reveal>
    </section>
  );
}

function StepLabel({ n, title }: { n: number; title: string }) {
  return (
    <div className="flex items-center gap-3">
      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-xs font-bold text-accent">
        {n}
      </span>
      <h3 className="text-base font-semibold text-fg md:text-lg">{title}</h3>
    </div>
  );
}

function EmptyCombo({ os, method, onPick }: { os: SetupOS; method: SetupMethod; onPick: (m: SetupMethod) => void }) {
  const guide = getSetupGuide(method, os);
  const available = METHOD_ORDER.filter((m) => isMethodAvailable(m, os));
  return (
    <div className="rounded-xl border border-dashed border-line bg-canvas/80 px-6 py-10 text-center">
      <p className="font-medium text-fg">
        {METHOD_META[method].label} is not available on {OS_META[os].label}
      </p>
      <p className="mx-auto mt-2 max-w-md text-sm text-fg-muted">{guide.unavailableReason}</p>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {available.map((id) => {
          const { label, Icon, color } = METHOD_META[id];
          return (
            <button
              key={id}
              type="button"
              onClick={() => onPick(id)}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-surface px-4 py-2.5 text-sm font-medium text-fg transition-colors hover:border-accent/40 hover:bg-accent-soft"
            >
              <Icon className="h-4 w-4" style={{ color }} aria-hidden />
              {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function GuideBody({
  guide,
  method,
  os,
}: {
  guide: ReturnType<typeof getSetupGuide>;
  method: SetupMethod;
  os: SetupOS;
}) {
  const headless = guide.showHeadlessDownload ? headlessDownloadFor(method, os) : null;

  return (
    <div className="space-y-8">
      <p className="text-sm leading-relaxed text-fg-muted md:text-base">{guide.summary}</p>

      {headless && <HeadlessDownloadPanel data={headless} />}

      <div className="rounded-xl border border-line bg-canvas/50 p-5">
        <p className="text-xs font-semibold uppercase tracking-wider text-fg-subtle">Before you start</p>
        <ul className="mt-3 space-y-2">
          {guide.prerequisites.map((item) => (
            <li key={item} className="flex gap-2 text-sm text-fg-muted">
              <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-accent" />
              {item}
            </li>
          ))}
        </ul>
        {guide.docsHref && (
          <a
            href={guide.docsHref}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
          >
            Full documentation on GitHub →
          </a>
        )}
      </div>

      <ol className="space-y-6">
        {guide.steps.map((step, i) => (
          <li key={step.title} className="relative border-l-2 border-line pl-6 pb-1">
            <span className="absolute -left-[9px] top-0 flex h-4 w-4 items-center justify-center rounded-full border-2 border-accent bg-surface" />
            <p className="text-xs font-semibold uppercase tracking-wider text-accent">Step {i + 1}</p>
            <p className="mt-1 font-medium text-fg">{step.title}</p>
            {step.body && <p className="mt-1 text-sm text-fg-muted">{step.body}</p>}
            {step.code && <CodeBlock code={step.code} lang={step.lang ?? "bash"} />}
          </li>
        ))}
      </ol>

      {guide.notes && guide.notes.length > 0 && (
        <div className="rounded-xl border border-accent/20 bg-accent-soft/40 p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">Good to know</p>
          <ul className="mt-2 space-y-1.5">
            {guide.notes.map((note) => (
              <li key={note} className="text-sm text-fg-muted">
                {note}
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function HeadlessDownloadPanel({ data }: { data: NonNullable<ReturnType<typeof headlessDownloadFor>> }) {
  return (
    <div className="rounded-xl border border-accent/25 bg-accent-soft/30 p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-accent">
            Headless download (@latest)
          </p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-fg-muted">{data.intro}</p>
        </div>
        <a
          href={GITHUB_LATEST_API}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 text-xs font-medium text-fg-subtle hover:text-accent"
        >
          Latest release API →
        </a>
      </div>

      <p className="mt-4 text-xs text-fg-subtle">
        Resolves the current tag from{" "}
        <code className="rounded bg-surface px-1 py-0.5 font-mono text-[11px] text-fg">{GITHUB_LATEST_API}</code>
        , then downloads from{" "}
        <code className="rounded bg-surface px-1 py-0.5 font-mono text-[11px] text-fg">
          github.com/…/releases/download/$TAG/…
        </code>
        .{" "}
        <a href={GITHUB_RELEASES_PAGE} className="text-accent hover:underline">
          Releases page
        </a>
      </p>

      <div className="mt-5 space-y-5">
        {data.variants.map((v) => (
          <HeadlessVariantBlock key={v.label} variant={v} />
        ))}
      </div>
    </div>
  );
}

function HeadlessVariantBlock({ variant }: { variant: HeadlessVariant }) {
  return (
    <div className="rounded-lg border border-line bg-surface/80 p-4">
      <p className="text-sm font-medium text-fg">{variant.label}</p>
      <p className="mt-1 break-all font-mono text-[11px] text-fg-subtle">
        Example:{" "}
        <a href={variant.exampleUrl} className="text-accent hover:underline">
          {variant.exampleUrl}
        </a>
      </p>
      <div className="mt-3">
        <CodeBlock code={variant.wget} lang="wget" label="wget" />
      </div>
    </div>
  );
}

function CodeBlock({
  code,
  lang,
  label,
}: {
  code: string;
  lang: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(code);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="mt-3 overflow-hidden rounded-lg border border-line bg-[var(--mock-bg)]">
      <div className="flex items-center justify-between border-b border-line px-3 py-1.5">
        <span className="font-mono text-[10px] uppercase text-fg-subtle">{label ?? lang}</span>
        <button
          type="button"
          onClick={copy}
          className="text-[11px] font-medium text-fg-muted hover:text-fg"
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </div>
      <pre className="overflow-x-auto p-3 font-mono text-xs leading-relaxed text-fg-muted">
        <code>{code}</code>
      </pre>
    </div>
  );
}
