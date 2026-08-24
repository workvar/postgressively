import type { PlatformId } from "@/lib/releases";
import { GITHUB_REPO } from "@/lib/releases";
import type { SetupMethod, SetupOS } from "@/lib/setup-guides";

export const GITHUB_LATEST_API = `https://api.github.com/repos/${GITHUB_REPO}/releases/latest`;
export const GITHUB_RELEASES_PAGE = `https://github.com/${GITHUB_REPO}/releases/latest`;

/** Asset filename: postggresively-v1.0.0-linux-amd64.tar.gz */
export function releaseAssetName(tag: string, platform: PlatformId): string {
  const suffix: Record<PlatformId, string> = {
    "darwin-amd64": "darwin-amd64.tar.gz",
    "darwin-arm64": "darwin-arm64.tar.gz",
    "linux-amd64": "linux-amd64.tar.gz",
    "linux-arm64": "linux-arm64.tar.gz",
    "linux-armv7": "linux-armv7.tar.gz",
    "windows-amd64": "windows-amd64.zip",
    "docker-compose": "docker-compose.tar.gz",
  };
  return `postggresively-${tag}-${suffix[platform]}`;
}

export function releaseAssetUrl(tag: string, platform: PlatformId): string {
  return `https://github.com/${GITHUB_REPO}/releases/download/${tag}/${releaseAssetName(tag, platform)}`;
}

const TAG_WGET =
  'TAG=$(wget -qO- "' +
  GITHUB_LATEST_API +
  '" | sed -n \'s/.*"tag_name": *"\\([^"]*\\)".*/\\1/p\')';

export type HeadlessVariant = {
  label: string;
  platform: PlatformId;
  wget: string;
  exampleUrl: string;
};

export type HeadlessDownload = {
  intro: string;
  variants: HeadlessVariant[];
};

function wgetDownload(platform: PlatformId): string {
  const file = `postggresively-\${TAG}-${platformFileSuffix(platform)}`;
  return (
    TAG_WGET +
    `\nwget "https://github.com/${GITHUB_REPO}/releases/download/\${TAG}/${file}"`
  );
}

function platformFileSuffix(platform: PlatformId): string {
  const suffix: Record<PlatformId, string> = {
    "darwin-amd64": "darwin-amd64.tar.gz",
    "darwin-arm64": "darwin-arm64.tar.gz",
    "linux-amd64": "linux-amd64.tar.gz",
    "linux-arm64": "linux-arm64.tar.gz",
    "linux-armv7": "linux-armv7.tar.gz",
    "windows-amd64": "windows-amd64.zip",
    "docker-compose": "docker-compose.tar.gz",
  };
  return suffix[platform];
}

function variant(platform: PlatformId, label: string): HeadlessVariant {
  return {
    label,
    platform,
    wget: wgetDownload(platform),
    exampleUrl: releaseAssetUrl("v1.0.0", platform),
  };
}

export function headlessDownloadFor(method: SetupMethod, os: SetupOS): HeadlessDownload | null {
  if (method === "docker") {
    return {
      intro:
        "No browser needed. These commands resolve the latest GitHub release tag, then download the Docker Compose bundle.",
      variants: [variant("docker-compose", "Docker Compose bundle")],
    };
  }

  if (method === "pm2") {
    switch (os) {
      case "windows":
        return {
          intro:
            "No browser needed. Resolves @latest from GitHub, then downloads the Windows PM2 bundle.",
          variants: [variant("windows-amd64", "Windows x64 (.zip)")],
        };
      case "macos":
        return {
          intro:
            "No browser needed. Resolves @latest from GitHub. Pick the archive that matches your Mac.",
          variants: [
            variant("darwin-arm64", "Apple Silicon (M1/M2/M3)"),
            variant("darwin-amd64", "Intel Mac"),
          ],
        };
      case "rpi":
        return {
          intro:
            "No browser needed. Resolves @latest from GitHub. Pi 4/5 on 64-bit OS use arm64; older 32-bit Pi OS use armv7.",
          variants: [
            variant("linux-armv7", "Raspberry Pi OS 32-bit (armv7)"),
            variant("linux-arm64", "Raspberry Pi OS 64-bit (arm64)"),
          ],
        };
      default:
        return {
          intro:
            "No browser needed. Resolves @latest from GitHub, then downloads the Linux PM2 bundle.",
          variants: [
            variant("linux-amd64", "Linux x64 (amd64)"),
            variant("linux-arm64", "Linux ARM64"),
          ],
        };
    }
  }

  if (method === "systemd" && (os === "linux" || os === "rpi")) {
    return {
      intro:
        "Systemd installs from source. Clone the repo, or fetch the main branch as a tarball — no release bundle required.",
      variants: [
        {
          label: "Git clone",
          platform: "linux-amd64",
          wget: `git clone https://github.com/${GITHUB_REPO}.git\ncd postgressively`,
          exampleUrl: `https://github.com/${GITHUB_REPO}`,
        },
        {
          label: "Tarball (no git)",
          platform: "linux-amd64",
          wget: `wget -O - https://github.com/${GITHUB_REPO}/archive/refs/heads/main.tar.gz | tar xz\ncd postgressively-main`,
          exampleUrl: `https://github.com/${GITHUB_REPO}/archive/refs/heads/main.tar.gz`,
        },
      ],
    };
  }

  return null;
}
