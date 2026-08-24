import Reveal from "@/components/motion/Reveal";
import { SectionHeading } from "./SectionHeading";

const FEATURES = [
  {
    eyebrow: "Browse",
    title: "Schema and data, one click away",
    body: "Inspect tables, columns, indexes, and row previews without juggling psql and GUI tools. The sidebar follows your connection and database context.",
    visual: "schema",
  },
  {
    eyebrow: "Query",
    title: "A SQL console that stays out of your way",
    body: "Run statements with autocomplete grounded in your live schema. Saved queries live in the console database, separate from your operator data.",
    visual: "query",
  },
  {
    eyebrow: "Secure",
    title: "Passkeys and step-up for destructive work",
    body: "Sign in with WebAuthn or password. Dropping databases, terminating backends, and deleting rows require a fresh five-minute elevated token.",
    visual: "secure",
  },
  {
    eyebrow: "Operate",
    title: "Server control from the same UI",
    body: "Start and stop the Postgres service, read logs, schedule backups, and monitor activity — through a local agent that never leaves the host.",
    visual: "server",
  },
];

export default function Features() {
  return (
    <section id="features" className="border-t border-line bg-surface px-5 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal direction="up">
          <SectionHeading
            eyebrow="Features"
            title={
              <>
                Everything you need to{" "}
                <span className="accent-gradient">run databases</span> day to day
              </>
            }
            subtitle="Not a hosted SaaS. A console you deploy next to your databases and control completely."
          />
        </Reveal>

        <div className="mt-16 grid gap-5 md:grid-cols-2">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} direction="up" delay={i * 100}>
              <article className="group surface-premium flex h-full flex-col p-7 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-float md:p-8">
                <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-accent">{f.eyebrow}</p>
                <h3 className="mt-3 text-xl font-semibold tracking-tight text-fg md:text-2xl">{f.title}</h3>
                <p className="mt-3 flex-1 text-sm leading-relaxed text-fg-muted md:text-base">{f.body}</p>
                <FeatureVisual kind={f.visual} />
              </article>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}

function FeatureVisual({ kind }: { kind: string }) {
  const base =
    "mt-6 overflow-hidden rounded-xl border border-line bg-[var(--mock-bg)] p-4 transition-transform duration-500 group-hover:scale-[1.01]";

  if (kind === "query") {
    return (
      <div className={base}>
        <pre className="font-mono text-xs leading-relaxed text-fg-muted md:text-sm">
          <span className="text-accent">SELECT</span> id, email, created_at{"\n"}
          <span className="text-accent">FROM</span> users{"\n"}
          <span className="text-accent">WHERE</span> active = true{"\n"}
          <span className="text-accent">ORDER BY</span> created_at <span className="text-accent">DESC</span>
          {"\n"}
          <span className="text-accent">LIMIT</span> 50;
        </pre>
        <p className="mt-3 text-xs text-fg-subtle">42 rows · 8.2 ms</p>
      </div>
    );
  }

  if (kind === "secure") {
    return (
      <div className={base}>
        <div className="flex items-center gap-3 rounded-lg border border-line bg-surface p-3">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-soft text-accent">
            ✓
          </span>
          <div>
            <p className="text-sm font-medium text-fg">Step-up verified</p>
            <p className="text-xs text-fg-subtle">Passkey · valid for 5 minutes</p>
          </div>
        </div>
      </div>
    );
  }

  if (kind === "server") {
    return (
      <div className={base}>
        <div className="flex items-center justify-between text-xs">
          <span className="font-medium text-fg">postgresql.service</span>
          <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-accent">running</span>
        </div>
        <div className="mt-3 space-y-1 font-mono text-[11px] text-fg-subtle">
          <p>CPU 12% · Memory 1.2 GB</p>
          <p>Last backup: today 02:00 UTC</p>
        </div>
      </div>
    );
  }

  return (
    <div className={base}>
      <div className="text-xs">
        <p className="font-medium text-fg">public.users</p>
        <div className="mt-2 grid grid-cols-1 gap-1 text-fg-subtle sm:grid-cols-3 sm:gap-2">
          <span>id · uuid</span>
          <span>email · text</span>
          <span>created_at · timestamptz</span>
        </div>
      </div>
    </div>
  );
}
