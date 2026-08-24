import { type ReactNode } from "react";

export default function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 rounded-pill border border-line bg-surface/60 px-3 py-1 text-xs font-medium tracking-wide text-accent backdrop-blur">
      <span className="h-1.5 w-1.5 rounded-full bg-accent shadow-[0_0_8px_var(--accent-glow-strong)]" />
      {children}
    </span>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  subtitle,
  align = "center",
}: {
  eyebrow: string;
  title: ReactNode;
  subtitle: string;
  align?: "center" | "left";
}) {
  return (
    <div className={align === "center" ? "mx-auto max-w-3xl text-center" : "max-w-2xl"}>
      <SectionLabel>{eyebrow}</SectionLabel>
      <h2 className="mt-5 font-sans text-section tracking-tight text-fg md:text-[2.75rem] md:leading-[1.08]">
        {title}
      </h2>
      <p className={`mt-4 text-base leading-relaxed text-fg-muted md:text-lg ${align === "center" ? "mx-auto max-w-2xl" : ""}`}>
        {subtitle}
      </p>
    </div>
  );
}
