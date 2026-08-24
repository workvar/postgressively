import Reveal, { Stagger } from "@/components/motion/Reveal";
import { SectionHeading } from "./SectionHeading";

const QUOTES = [
  {
    text: "Finally a database console that respects the operator's stack — local agent, encrypted connections, no cloud account required.",
    role: "Platform engineer",
    context: "Self-hosted infra",
  },
  {
    text: "The step-up flow for destructive actions is exactly what we wanted. Passkeys on login, password for the rare drop-database moment.",
    role: "Security-minded DBA",
    context: "Production Postgres",
  },
  {
    text: "One UI for the Postgres on the box and the MySQL staging instance. Saved connection strings just work.",
    role: "Full-stack developer",
    context: "Multi-engine setup",
  },
];

export default function Quotes() {
  return (
    <section className="px-5 py-24 md:py-32">
      <div className="mx-auto max-w-6xl">
        <Reveal direction="up">
          <SectionHeading
            eyebrow="Why operators choose it"
            title={
              <>
                Control without{" "}
                <span className="font-serif italic text-fg-muted">compromise</span>
              </>
            }
            subtitle="Postggresively is designed for teams who run their own databases and want a console that stays on their terms."
          />
        </Reveal>

        <Stagger
          className="mt-16 grid gap-5 md:grid-cols-3"
          stagger={140}
          direction="up"
        >
          {QUOTES.map((q) => (
            <blockquote
              key={q.text}
              className="surface-premium glow-ring flex flex-col justify-between p-7 transition-[transform,box-shadow] duration-300 hover:-translate-y-1 hover:shadow-float"
            >
              <p className="text-base leading-relaxed text-fg">&ldquo;{q.text}&rdquo;</p>
              <footer className="mt-6 border-t border-line pt-5">
                <p className="text-sm font-medium text-fg">{q.role}</p>
                <p className="text-xs text-fg-subtle">{q.context}</p>
              </footer>
            </blockquote>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
