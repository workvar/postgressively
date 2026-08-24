import Reveal from "@/components/motion/Reveal";

const ITEMS = [
  "PostgreSQL",
  "MySQL",
  "MariaDB",
  "SQLite",
  "SQL Server",
  "WebAuthn",
  "Docker",
  "systemd",
  "PM2",
  "ARM64",
  "Raspberry Pi",
  "AES-256-GCM",
];

export default function Marquee() {
  const track = [...ITEMS, ...ITEMS];

  return (
    <section className="overflow-hidden border-b border-line py-8">
      <Reveal direction="none" threshold={0.05}>
        <p className="mb-6 text-center text-xs font-medium uppercase tracking-[0.2em] text-fg-subtle">
          Built for modern infrastructure
        </p>
      </Reveal>
      <div className="relative">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-24 bg-gradient-to-r from-canvas to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-24 bg-gradient-to-l from-canvas to-transparent" />
        <div className="marquee-track flex w-max gap-3">
          {track.map((item, i) => (
            <span
              key={`${item}-${i}`}
              className="whitespace-nowrap rounded-pill border border-line bg-surface px-4 py-2 text-sm text-fg-muted"
            >
              {item}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
