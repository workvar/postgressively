// Minimal, hand-written equivalent of Microsoft Clarity's own loader
// snippet (https://clarity.microsoft.com), so this file can stay readable
// TypeScript instead of an inlined third-party blob.

type ClarityFn = ((...args: unknown[]) => void) & { q?: unknown[][] };

declare global {
  interface Window {
    clarity?: ClarityFn;
  }
}

let injected = false;

/**
 * Injects the Clarity loader script once per page load. Safe to call more
 * than once (React effects can re-run in development / Strict Mode).
 */
export function loadClarity(projectId: string) {
  if (injected || typeof window === "undefined") return;
  injected = true;

  const queue: ClarityFn = (...args: unknown[]) => {
    (queue.q = queue.q || []).push(args);
  };
  window.clarity = window.clarity || queue;

  const script = document.createElement("script");
  script.async = true;
  script.src = `https://www.clarity.ms/tag/${projectId}`;
  document.head.appendChild(script);
}
