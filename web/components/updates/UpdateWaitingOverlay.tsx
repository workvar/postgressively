"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LogoMark } from "@/components/brand/Logo";

/** Blocks the console while services restart and the web UI comes back. */
export default function UpdateWaitingOverlay({ message }: { message?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-canvas/92 px-6 backdrop-blur-sm"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="update-wait-title"
      aria-describedby="update-wait-desc"
    >
      <div className="flex max-w-sm flex-col items-center text-center animate-fadeUp">
        <div className="relative">
          <span
            className="absolute inset-[-10px] rounded-[18px] border-2 border-accent/30 animate-waitRing"
            aria-hidden
          />
          <LogoMark size={44} className="relative animate-pulseSoft" />
        </div>
        <h2 id="update-wait-title" className="mt-5 text-subtitle text-fg">
          Updating console…
        </h2>
        <p id="update-wait-desc" className="mt-1.5 text-small text-fg-muted">
          {message || "Services are restarting. This page will reload when the new version is ready."}
        </p>
        <div className="mt-5 flex items-center gap-1.5" aria-hidden>
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulseDot" />
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulseDot [animation-delay:160ms]" />
          <span className="h-1.5 w-1.5 rounded-full bg-accent animate-pulseDot [animation-delay:320ms]" />
        </div>
      </div>
    </div>,
    document.body,
  );
}
