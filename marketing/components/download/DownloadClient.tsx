"use client";

import { useEffect, useMemo, useState } from "react";
import {
  PLATFORMS,
  assetForPlatform,
  detectPlatform,
  formatBytes,
  formatDate,
  type PlatformId,
  type Release,
} from "@/lib/releases";

export default function DownloadClient({ releases }: { releases: Release[] }) {
  const latest = releases[0] ?? null;
  const [platform, setPlatform] = useState<PlatformId>("linux-amd64");

  useEffect(() => {
    setPlatform(detectPlatform());
  }, []);

  const selectedAsset = useMemo(
    () => (latest ? assetForPlatform(latest, platform) : null),
    [latest, platform],
  );

  if (!latest) {
    return (
      <div className="rounded-2xl border border-line bg-surface p-8 text-center">
        <p className="text-fg-muted">No releases found yet.</p>
        <a
          href="https://github.com/workvar/postgressively/releases"
          className="mt-4 inline-block text-sm text-accent hover:underline"
        >
          Check GitHub releases →
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      <div className="grid gap-8 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)] xl:items-start">
        <section className="surface-premium glow-ring p-6 md:p-8">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-accent">Latest release</p>
              <h2 className="mt-1 text-2xl font-semibold tracking-tight text-fg">{latest.name}</h2>
              <p className="mt-1 text-sm text-fg-muted">Published {formatDate(latest.publishedAt)}</p>
            </div>
            <span className="rounded-pill bg-accent-soft px-3 py-1 text-xs font-medium text-accent">
              {latest.tagName}
            </span>
          </div>

          <div className="mt-8">
            <p className="text-sm font-medium text-fg">Choose your platform</p>
            <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-2 2xl:grid-cols-3">
              {PLATFORMS.map((p) => {
                const active = platform === p.id;
                const hasAsset = !!assetForPlatform(latest, p.id);
                return (
                  <button
                    key={p.id}
                    type="button"
                    disabled={!hasAsset}
                    onClick={() => setPlatform(p.id)}
                    className={`rounded-xl border px-4 py-3 text-left text-sm transition-colors ${
                      active
                        ? "border-accent bg-accent-soft text-fg"
                        : hasAsset
                          ? "border-line bg-canvas text-fg-muted hover:border-line hover:bg-surface-2 hover:text-fg"
                          : "cursor-not-allowed border-line/50 bg-canvas/50 text-fg-subtle opacity-60"
                    }`}
                  >
                    <span className="font-medium">{p.label}</span>
                    {!hasAsset && <span className="mt-0.5 block text-xs">Not available</span>}
                  </button>
                );
              })}
            </div>
          </div>

          {selectedAsset ? (
            <div className="mt-8 flex flex-col gap-4 rounded-xl border border-line bg-canvas p-5 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <p className="truncate font-mono text-sm text-fg">{selectedAsset.name}</p>
                <p className="mt-1 text-xs text-fg-subtle">
                  {formatBytes(selectedAsset.size)}
                  {selectedAsset.downloadCount > 0 &&
                    ` · ${selectedAsset.downloadCount.toLocaleString()} downloads`}
                </p>
              </div>
              <a
                href={selectedAsset.browserDownloadUrl}
                className="inline-flex shrink-0 items-center justify-center rounded-xl bg-fg px-5 py-2.5 text-sm font-medium text-canvas transition-opacity hover:opacity-90"
              >
                Download
              </a>
            </div>
          ) : (
            <p className="mt-8 text-sm text-fg-muted">No asset for this platform in the latest release.</p>
          )}
        </section>

        <section className="min-w-0">
          <h3 className="text-lg font-semibold text-fg">All releases</h3>
          <p className="mt-1 text-sm text-fg-muted">Previous versions and per-platform downloads.</p>

          <div className="mt-6 max-h-[min(70vh,720px)] space-y-3 overflow-y-auto pr-1">
            {releases.map((release) => (
              <ReleaseCard key={release.tagName} release={release} defaultOpen={release.isLatest} />
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}

function ReleaseCard({ release, defaultOpen }: { release: Release; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen ?? false);

  return (
    <article className="overflow-hidden rounded-2xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors hover:bg-surface-2"
      >
        <div>
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-semibold text-fg">{release.tagName}</span>
            {release.isLatest && (
              <span className="rounded-pill bg-accent-soft px-2 py-0.5 text-[11px] font-medium text-accent">
                Latest
              </span>
            )}
          </div>
          <p className="mt-0.5 text-sm text-fg-muted">{formatDate(release.publishedAt)}</p>
        </div>
        <span className="text-fg-subtle">{open ? "−" : "+"}</span>
      </button>

      {open && (
        <div className="border-t border-line px-5 py-4">
          {release.body && (
            <details className="mb-4">
              <summary className="cursor-pointer text-sm font-medium text-fg-muted hover:text-fg">
                Release notes
              </summary>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap rounded-xl border border-line bg-canvas p-4 text-xs leading-relaxed text-fg-muted">
                {release.body.trim()}
              </pre>
            </details>
          )}

          <ul className="grid gap-2 sm:grid-cols-2">
            {release.assets.length === 0 ? (
              <li className="rounded-xl border border-line px-4 py-3 text-sm text-fg-muted sm:col-span-2">
                No downloadable assets.
              </li>
            ) : (
              release.assets.map((asset) => (
                <li
                  key={asset.name}
                  className="flex flex-col gap-2 rounded-xl border border-line px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="min-w-0">
                    <p className="truncate font-mono text-xs text-fg">{asset.name}</p>
                    <p className="text-[11px] text-fg-subtle">{formatBytes(asset.size)}</p>
                  </div>
                  <a
                    href={asset.browserDownloadUrl}
                    className="inline-flex shrink-0 text-sm font-medium text-accent hover:underline"
                  >
                    Download
                  </a>
                </li>
              ))
            )}
          </ul>
        </div>
      )}
    </article>
  );
}
