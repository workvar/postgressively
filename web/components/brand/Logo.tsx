/** Postggresively mark: stacked database discs forming a rising "step" motion. */
export function LogoMark({ size = 28, className = "" }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      fill="none"
      role="img"
      aria-label="Postggresively"
      className={className}
    >
      <rect width="32" height="32" rx="8.5" fill="var(--accent)" />
      <ellipse cx="16" cy="10.5" rx="7.5" ry="3" fill="#fff" fillOpacity="0.95" />
      <path
        d="M8.5 10.5v5c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-5"
        stroke="#fff"
        strokeOpacity="0.95"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M8.5 16v5c0 1.66 3.36 3 7.5 3s7.5-1.34 7.5-3v-5"
        stroke="#fff"
        strokeOpacity="0.55"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M12.5 22.5l3-3 3 3"
        stroke="#fff"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <span className="flex items-center gap-2.5">
      <LogoMark size={28} />
      {!compact && (
        <span className="truncate text-[15px] font-semibold tracking-[-0.01em] text-fg">
          postggres<span className="text-accent">ively</span>
        </span>
      )}
    </span>
  );
}
