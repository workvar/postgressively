import type { ReactNode } from "react";

const paths: Record<string, ReactNode> = {
  gauge: (
    <>
      <circle cx="10" cy="10" r="7" />
      <path d="M10 10l3.5-3" strokeLinecap="round" />
    </>
  ),
  database: (
    <>
      <ellipse cx="10" cy="5.5" rx="6" ry="2.5" />
      <path d="M4 5.5v9c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5v-9" />
      <path d="M4 10c0 1.38 2.69 2.5 6 2.5s6-1.12 6-2.5" />
    </>
  ),
  stack: (
    <>
      <path d="M10 2.5 17 6l-7 3.5L3 6l7-3.5Z" strokeLinejoin="round" />
      <path d="m3 10 7 3.5L17 10" strokeLinejoin="round" />
      <path d="m3 14 7 3.5L17 14" strokeLinejoin="round" />
    </>
  ),
  terminal: (
    <>
      <rect x="2.5" y="4" width="15" height="12" rx="2.5" />
      <path d="M6 8.5l2.5 2L6 13M11 13h3" strokeLinecap="round" strokeLinejoin="round" />
    </>
  ),
  server: (
    <>
      <rect x="3" y="3.5" width="14" height="5.5" rx="1.8" />
      <rect x="3" y="11" width="14" height="5.5" rx="1.8" />
      <path d="M6 6.25h.01M6 13.75h.01" strokeLinecap="round" />
    </>
  ),
  plug: (
    <>
      <path d="M7 3v4M13 3v4" strokeLinecap="round" />
      <path d="M5 7h10v3a5 5 0 0 1-10 0V7Z" strokeLinejoin="round" />
      <path d="M10 15v3" strokeLinecap="round" />
    </>
  ),
  plus: <path d="M10 4.5v11M4.5 10h11" strokeLinecap="round" />,
};

export default function NavIcon({ name, className = "" }: { name: string; className?: string }) {
  return (
    <svg
      viewBox="0 0 20 20"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.5"
      aria-hidden
      className={`h-[17px] w-[17px] shrink-0 ${className}`}
    >
      {paths[name] ?? null}
    </svg>
  );
}
