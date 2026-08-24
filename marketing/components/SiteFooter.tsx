import Link from "next/link";
import Reveal from "@/components/motion/Reveal";
import { GITHUB_REPO } from "@/lib/releases";

export default function SiteFooter() {
  return (
    <footer className="border-t border-line bg-surface">
      <div className="mx-auto w-full max-w-7xl px-5 py-16 sm:px-8 lg:px-10 xl:px-12">
        <Reveal direction="up">
          <div className="flex flex-col gap-10 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <p className="text-lg font-semibold text-fg">Postggresively</p>
              <p className="mt-2 max-w-sm text-sm leading-relaxed text-fg-muted">
                A self-hosted web console for Postgres and other relational databases on your server.
              </p>
            </div>
            <div className="flex flex-wrap gap-x-8 gap-y-3 text-sm text-fg-muted">
              <Link href="/download" className="transition-colors hover:text-fg">
                Download
              </Link>
              <a
                href={`https://github.com/${GITHUB_REPO}`}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-fg"
              >
                GitHub
              </a>
              <a
                href={`https://github.com/${GITHUB_REPO}/releases`}
                target="_blank"
                rel="noopener noreferrer"
                className="transition-colors hover:text-fg"
              >
                Releases
              </a>
            </div>
          </div>
        </Reveal>
      </div>
      <div className="border-t border-line py-5 text-center text-xs text-fg-subtle">
        © {new Date().getFullYear()} Postggresively · MIT licensed
      </div>
    </footer>
  );
}
