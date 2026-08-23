import Link from "next/link";

export default function Banner({
  title,
  body,
  ctaLabel,
  href,
}: {
  title: string;
  body: string;
  ctaLabel: string;
  href: string;
}) {
  return (
    <div className="animate-fadeUp relative mb-5 overflow-hidden rounded-xl border border-line bg-surface-2 px-4 py-3.5">
      <div className="relative z-10 max-w-[70ch]">
        <p className="text-subtitle text-fg">{title}</p>
        <p className="mt-0.5 text-small text-fg-muted">{body}</p>
        <Link
          href={href}
          className="mt-2 inline-flex items-center gap-1 text-small font-medium text-accent hover:underline"
        >
          {ctaLabel} <span aria-hidden>→</span>
        </Link>
      </div>
      <svg
        aria-hidden
        viewBox="0 0 200 120"
        className="pointer-events-none absolute -right-4 -top-4 h-[130%] w-auto opacity-[0.12]"
      >
        <ellipse cx="100" cy="30" rx="55" ry="18" fill="var(--accent)" />
        <path d="M45 30v45c0 10 25 18 55 18s55-8 55-18V30" stroke="var(--accent)" strokeWidth="9" fill="none" />
        <path d="M45 58c0 10 25 18 55 18s55-8 55-18" stroke="var(--brand)" strokeWidth="9" fill="none" />
      </svg>
    </div>
  );
}
