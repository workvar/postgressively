import Reveal, { Stagger } from "@/components/motion/Reveal";
import Button from "@/components/ui/Button";
import { SectionHeading } from "./SectionHeading";

const OPTIONS = [
  {
    title: "PM2 release bundle",
    body: "Pre-built binaries for Linux, macOS, and Windows — including ARM64 and Raspberry Pi.",
    tag: "Recommended",
  },
  {
    title: "Docker Compose",
    body: "Full stack with Postgres, agent, backend, and web. Multi-arch images on every tag.",
    tag: "Containers",
  },
  {
    title: "Systemd units",
    body: "User-level services on Linux. No root required for the console itself.",
    tag: "Linux",
  },
  {
    title: "Local development",
    body: "Three-process dev setup with hot reload for the web UI.",
    tag: "Contributors",
  },
];

export default function Deploy() {
  return (
    <section id="deploy" className="border-t border-line bg-surface px-5 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal direction="up">
          <SectionHeading
            eyebrow="Deploy your way"
            title="Ship on bare metal, Pi, or Docker"
            subtitle="Every release publishes platform archives and compose bundles to GitHub. Pick the path that matches your infrastructure."
          />
        </Reveal>

        <Stagger className="mt-16 grid gap-4 sm:grid-cols-2" stagger={100} direction="scale">
          {OPTIONS.map((o) => (
            <div
              key={o.title}
              className="group rounded-2xl border border-line bg-canvas p-6 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-1 hover:border-accent/25 hover:shadow-panel md:p-7"
            >
              <span className="rounded-pill border border-line bg-surface px-2.5 py-0.5 text-[11px] font-medium text-fg-muted">
                {o.tag}
              </span>
              <h3 className="mt-4 text-lg font-semibold text-fg">{o.title}</h3>
              <p className="mt-2 text-sm leading-relaxed text-fg-muted">{o.body}</p>
            </div>
          ))}
        </Stagger>

        <Reveal direction="blur" delay={200}>
          <div className="relative mt-16 overflow-hidden rounded-3xl border border-line p-px">
            <div className="absolute inset-0 bg-[var(--cta-bg)]" />
            <div className="pointer-events-none absolute -left-20 top-0 h-64 w-64 rounded-full bg-[var(--orb-1)] blur-[80px]" />
            <div className="relative px-6 py-14 text-center md:px-12 md:py-16">
              <h3 className="text-2xl font-semibold tracking-tight text-fg md:text-3xl">
                Ready to install?
              </h3>
              <p className="mx-auto mt-3 max-w-md text-base text-fg-muted">
                Download the latest release for your platform, or browse previous versions and release
                notes.
              </p>
              <div className="mt-8">
                <Button href="/download" variant="accent">
                  Go to downloads
                </Button>
              </div>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
