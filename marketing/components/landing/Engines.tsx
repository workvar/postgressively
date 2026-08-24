import Reveal, { Stagger } from "@/components/motion/Reveal";
import { SectionHeading } from "./SectionHeading";

const ENGINES = [
  {
    name: "PostgreSQL",
    detail: "Full feature set including row editor, database creation, activity monitoring, and agent pages.",
    badge: "Full support",
  },
  {
    name: "MySQL / MariaDB",
    detail: "Browse schemas, preview rows, and run queries against remote instances.",
    badge: "Browse & query",
  },
  {
    name: "SQLite",
    detail: "Point at a file path and inspect tables without installing a server.",
    badge: "Browse & query",
  },
  {
    name: "SQL Server",
    detail: "Connect with encrypted connection strings stored under AES-256-GCM.",
    badge: "Browse & query",
  },
];

export default function Engines() {
  return (
    <section id="engines" className="px-5 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <div className="grid items-start gap-16 lg:grid-cols-2 lg:gap-20">
          <div>
            <Reveal direction="left">
              <SectionHeading
                align="left"
                eyebrow="Multi-engine"
                title={
                  <>
                    One console,
                    <br />
                    <span className="font-serif italic text-fg-muted">many connection strings</span>
                  </>
                }
                subtitle="Start with the Postgres instance on your server, then add remote databases from the Connections page. Strings are encrypted at rest; only redacted forms reach the browser."
              />
            </Reveal>

            <Stagger className="mt-10 space-y-3" stagger={90} direction="left">
              {ENGINES.map((e) => (
                <li
                  key={e.name}
                  className="list-none rounded-2xl border border-line bg-surface/80 p-5 backdrop-blur transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-0.5 hover:border-accent/30 hover:shadow-panel"
                >
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium text-fg">{e.name}</p>
                    <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                      {e.badge}
                    </span>
                  </div>
                  <p className="mt-1.5 text-sm leading-relaxed text-fg-muted">{e.detail}</p>
                </li>
              ))}
            </Stagger>
          </div>

          <Reveal direction="right" delay={120}>
            <div className="surface-premium glow-ring sticky top-28 p-7 md:p-8">
              <p className="text-[11px] font-semibold uppercase tracking-[0.15em] text-fg-subtle">
                Architecture
              </p>
              <div className="mt-8 space-y-4">
                <ArchBlock title="Browser" subtitle="Next.js console UI" />
                <Connector />
                <ArchBlock title="Backend" subtitle="Auth, SQL, schema API" accent />
                <Connector />
                <div className="grid grid-cols-2 gap-3">
                  <ArchBlock title="Agent" subtitle="systemd, logs, backups" small />
                  <ArchBlock title="Postgres" subtitle="your data" small />
                </div>
              </div>
              <p className="mt-8 text-xs leading-relaxed text-fg-subtle">
                The agent is localhost-only. The backend is the only component exposed to the network.
              </p>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}

function ArchBlock({
  title,
  subtitle,
  accent,
  small,
}: {
  title: string;
  subtitle: string;
  accent?: boolean;
  small?: boolean;
}) {
  return (
    <div
      className={`rounded-xl border border-line transition-colors duration-300 ${accent ? "bg-accent-soft" : "bg-canvas"} ${small ? "p-3.5" : "p-4"}`}
    >
      <p className={`font-medium ${accent ? "text-accent" : "text-fg"} ${small ? "text-sm" : ""}`}>
        {title}
      </p>
      <p className={`text-fg-subtle ${small ? "text-[11px]" : "text-xs"}`}>{subtitle}</p>
    </div>
  );
}

function Connector() {
  return (
    <div className="flex justify-center">
      <div className="h-7 w-px bg-gradient-to-b from-line via-accent/40 to-line" />
    </div>
  );
}
