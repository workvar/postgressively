"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { clearToken } from "@/lib/auth";

export default function Topbar({ crumbs }: { crumbs: string[] }) {
  const router = useRouter();

  function signOut() {
    clearToken();
    router.replace("/login");
  }

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center justify-between gap-4 border-b border-line bg-surface/85 px-5 backdrop-blur-xl">
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-small">
        <span className="text-fg-subtle">Local server</span>
        {crumbs.map((c) => (
          <span key={c} className="flex min-w-0 items-center gap-1.5">
            <span className="text-fg-subtle">/</span>
            <span className="truncate text-fg-muted last:font-medium last:text-fg">{c}</span>
          </span>
        ))}
      </nav>

      <div className="flex items-center gap-2">
        <span className="hidden items-center gap-1.5 rounded-pill border border-line bg-surface-2 px-2.5 py-1 text-caption text-fg-muted sm:flex">
          <span className="h-1.5 w-1.5 rounded-full bg-success" />
          Agent connected
        </span>
        <Button variant="ghost" size="sm" onClick={signOut}>
          Sign out
        </Button>
        <Link
          href="/account"
          title="Account"
          aria-label="Account"
          className="grid h-8 w-8 place-items-center rounded-full bg-surface-2 text-caption font-semibold text-fg-muted transition-colors duration-150 ease-apple hover:bg-surface-hover hover:text-fg"
        >
          A
        </Link>
      </div>
    </header>
  );
}
