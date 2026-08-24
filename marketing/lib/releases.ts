export const GITHUB_REPO = "workvar/postgressively";
export const GITHUB_RELEASES_URL = `https://api.github.com/repos/${GITHUB_REPO}/releases`;

export type ReleaseAsset = {
  name: string;
  size: number;
  downloadCount: number;
  browserDownloadUrl: string;
};

export type Release = {
  tagName: string;
  name: string;
  publishedAt: string;
  body: string;
  isLatest: boolean;
  assets: ReleaseAsset[];
};

export type PlatformId =
  | "darwin-amd64"
  | "darwin-arm64"
  | "linux-amd64"
  | "linux-arm64"
  | "linux-armv7"
  | "windows-amd64"
  | "docker-compose";

export type PlatformMeta = {
  id: PlatformId;
  label: string;
  os: "macOS" | "Linux" | "Windows" | "Docker";
  arch?: string;
};

export const PLATFORMS: PlatformMeta[] = [
  { id: "darwin-arm64", label: "macOS (Apple Silicon)", os: "macOS", arch: "arm64" },
  { id: "darwin-amd64", label: "macOS (Intel)", os: "macOS", arch: "amd64" },
  { id: "linux-amd64", label: "Linux (x64)", os: "Linux", arch: "amd64" },
  { id: "linux-arm64", label: "Linux (ARM64)", os: "Linux", arch: "arm64" },
  { id: "linux-armv7", label: "Linux (ARMv7 / Raspberry Pi)", os: "Linux", arch: "armv7" },
  { id: "windows-amd64", label: "Windows (x64)", os: "Windows", arch: "amd64" },
  { id: "docker-compose", label: "Docker Compose stack", os: "Docker" },
];

const ASSET_SUFFIX: Record<PlatformId, string> = {
  "darwin-amd64": "darwin-amd64.tar.gz",
  "darwin-arm64": "darwin-arm64.tar.gz",
  "linux-amd64": "linux-amd64.tar.gz",
  "linux-arm64": "linux-arm64.tar.gz",
  "linux-armv7": "linux-armv7.tar.gz",
  "windows-amd64": "windows-amd64.zip",
  "docker-compose": "docker-compose.tar.gz",
};

export function assetForPlatform(release: Release, platform: PlatformId): ReleaseAsset | null {
  const suffix = ASSET_SUFFIX[platform];
  const asset = release.assets.find((a) => a.name.endsWith(suffix));
  return asset ?? null;
}

export function detectPlatform(): PlatformId {
  if (typeof window === "undefined") return "linux-amd64";
  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() ?? "";

  if (ua.includes("win")) return "windows-amd64";
  if (platform.includes("mac") || ua.includes("mac")) {
    return ua.includes("arm") || platform.includes("arm") ? "darwin-arm64" : "darwin-amd64";
  }
  if (ua.includes("arm") || platform.includes("arm")) return "linux-arm64";
  return "linux-amd64";
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

type GitHubRelease = {
  tag_name: string;
  name: string;
  published_at: string;
  body: string;
  assets: Array<{
    name: string;
    size: number;
    download_count: number;
    browser_download_url: string;
  }>;
};

export async function fetchReleases(): Promise<Release[]> {
  const res = await fetch(GITHUB_RELEASES_URL, {
    headers: { Accept: "application/vnd.github+json" },
    next: { revalidate: 600 },
  });

  if (!res.ok) {
    throw new Error(`GitHub releases unavailable (${res.status})`);
  }

  const data = (await res.json()) as GitHubRelease[];

  return data.map((r, i) => ({
    tagName: r.tag_name,
    name: r.name || r.tag_name,
    publishedAt: r.published_at,
    body: r.body,
    isLatest: i === 0,
    assets: r.assets.map((a) => ({
      name: a.name,
      size: a.size,
      downloadCount: a.download_count,
      browserDownloadUrl: a.browser_download_url,
    })),
  }));
}
