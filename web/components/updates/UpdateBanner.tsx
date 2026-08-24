"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import Button from "@/components/ui/Button";
import { dismissUpdate, dismissedUpdateTag, getUpdateInfo } from "@/lib/updates";

/** Soft banner when a newer release is available. Dismiss lasts for the tab session. */
export default function UpdateBanner() {
  const [latest, setLatest] = useState<string | null>(null);
  const [current, setCurrent] = useState("");

  useEffect(() => {
    let cancelled = false;
    getUpdateInfo()
      .then((info) => {
        if (cancelled || !info.available || !info.latest) return;
        if (dismissedUpdateTag() === info.latest) return;
        setLatest(info.latest);
        setCurrent(info.current);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!latest) return null;

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-accent/25 bg-accent-soft px-5 py-2.5 text-small text-fg">
      <p>
        <span className="font-medium">Update available:</span> {current || "this build"} → {latest}
      </p>
      <div className="flex items-center gap-2">
        <Link
          href="/updates"
          className="rounded-lg bg-accent px-3 py-1.5 text-caption font-medium text-accent-fg transition-colors duration-150 ease-apple hover:bg-accent-hover"
        >
          View update
        </Link>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            dismissUpdate(latest);
            setLatest(null);
          }}
        >
          Dismiss
        </Button>
      </div>
    </div>
  );
}
