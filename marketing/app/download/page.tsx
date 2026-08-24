import type { Metadata } from "next";
import DownloadClient from "@/components/download/DownloadClient";
import SetupGuide from "@/components/download/SetupGuide";
import Reveal from "@/components/motion/Reveal";
import { fetchReleases } from "@/lib/releases";

export const metadata: Metadata = {
  title: "Download",
  description: "Download Postggresively for Linux, macOS, Windows, Docker, and Raspberry Pi.",
};

export default async function DownloadPage() {
  let releases: Awaited<ReturnType<typeof fetchReleases>> = [];
  let error: string | null = null;

  try {
    releases = await fetchReleases();
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load releases";
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-5 sm:px-8 lg:px-10 xl:px-12 py-16 md:py-24">
      <Reveal direction="blur">
        <div className="mb-12 max-w-3xl">
          <p className="text-sm font-medium text-accent">Releases</p>
          <h1 className="mt-3 text-hero text-fg md:text-display">
            Download{" "}
            <span className="font-serif italic text-fg-muted">Postggresively</span>
          </h1>
          <p className="mt-4 text-base leading-relaxed text-fg-muted md:text-lg">
            Install the latest stable build for your platform, or pick an older release from the list
            below.
          </p>
        </div>
      </Reveal>

      {error ? (
        <Reveal direction="up" delay={100}>
          <div className="surface-premium p-8">
            <p className="font-medium text-fg">Could not load releases</p>
            <p className="mt-2 text-sm text-fg-muted">{error}</p>
            <a
              href="https://github.com/workvar/postgressively/releases"
              className="mt-4 inline-block text-sm font-medium text-accent hover:underline"
            >
              Open GitHub releases →
            </a>
          </div>
        </Reveal>
      ) : (
        <Reveal direction="up" delay={120}>
          <DownloadClient releases={releases} />
        </Reveal>
      )}

      <SetupGuide />
    </div>
  );
}
