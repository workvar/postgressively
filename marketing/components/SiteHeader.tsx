"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import ThemeToggle from "./ThemeToggle";

const NAV = [
  { href: "/#features", label: "Features" },
  { href: "/#engines", label: "Engines" },
  { href: "/#deploy", label: "Deploy" },
  { href: "/download", label: "Download" },
  { href: "/download#setup", label: "Setup" },
];

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className={`sticky top-0 z-50 transition-[background-color,box-shadow,border-color] duration-300 ${
        scrolled
          ? "border-b border-line/80 bg-canvas/90 shadow-[0_8px_32px_rgba(0,0,0,0.06)] backdrop-blur-xl dark:shadow-[0_8px_32px_rgba(0,0,0,0.35)]"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-16 w-full max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10 xl:px-12">
        <Link
          href="/"
          className="group flex items-center gap-2.5 font-semibold tracking-tight text-fg transition-opacity hover:opacity-80"
        >
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-accent text-sm text-white shadow-[0_0_20px_var(--accent-glow)] transition-transform duration-200 group-hover:scale-105">
            P
          </span>
          Postggresively
        </Link>

        <nav className="hidden items-center gap-8 text-sm text-fg-muted md:flex">
          {NAV.map((item) =>
            item.href.includes("#") && !item.href.startsWith("/#") ? (
              <a key={item.href} href={item.href} className="transition-colors hover:text-fg">
                {item.label}
              </a>
            ) : item.href.startsWith("/#") ? (
              <a key={item.href} href={item.href} className="transition-colors hover:text-fg">
                {item.label}
              </a>
            ) : (
              <Link key={item.href} href={item.href} className="transition-colors hover:text-fg">
                {item.label}
              </Link>
            ),
          )}
        </nav>

        <div className="flex items-center gap-2">
          <ThemeToggle />
          <Link
            href="/download"
            className="hidden rounded-xl bg-fg px-4 py-2 text-sm font-medium text-canvas transition-[transform,filter] duration-200 hover:brightness-110 active:scale-[0.98] sm:inline-flex"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}
