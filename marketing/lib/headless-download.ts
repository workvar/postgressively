import type { PlatformId } from "@/lib/releases";
import { GITHUB_REPO } from "@/lib/releases";
import type { SetupMethod, SetupOS } from "@/lib/setup-guides";

export const GITHUB_RELEASES_PAGE = `https://github.com/${GITHUB_REPO}/releases/latest`;

/** Asset filename: postggresively-v1.1.1-linux-amd64.tar.gz */
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

export type HeadlessVariant = {
  label: string;
  platform: PlatformId;
  wget: string;
  url: string;
};

export type HeadlessDownload = {
  intro: string;
  variants: HeadlessVariant[];
};

function variant(platform: PlatformId, label: string, latestTag: string): HeadlessVariant {
  const url = releaseAssetUrl(latestTag, platform);
  return {
    label,
    platform,
    url,
    wget: `wget "${url}"`,
  };
}

export function headlessDownloadFor(
  method: SetupMethod,
  os: SetupOS,
  latestTag: string,
): HeadlessDownload | null {
  if (method === "docker") {
    return {
      intro: "Download the Docker Compose bundle for the latest release — no browser required.",
      variants: [variant("docker-compose", "Docker Compose bundle", latestTag)],
    };
  }

  if (method === "pm2") {
    switch (os) {
      case "windows":
        return {
          intro: "Download the Windows PM2 bundle for the latest release — no browser required.",
          variants: [variant("windows-amd64", "Windows x64 (.zip)", latestTag)],
        };
      case "macos":
        return {
          intro: "Download the macOS PM2 bundle for the latest release. Pick the archive that matches your Mac.",
          variants: [
            variant("darwin-arm64", "Apple Silicon (M1/M2/M3)", latestTag),
            variant("darwin-amd64", "Intel Mac", latestTag),
          ],
        };
      case "rpi":
        return {
          intro:
            "Download the Raspberry Pi PM2 bundle for the latest release. Pi 4/5 on 64-bit OS use arm64; older 32-bit Pi OS use armv7.",
          variants: [
            variant("linux-armv7", "Raspberry Pi OS 32-bit (armv7)", latestTag),
            variant("linux-arm64", "Raspberry Pi OS 64-bit (arm64)", latestTag),
          ],
        };
      default:
        return {
          intro: "Download the Linux PM2 bundle for the latest release — no browser required.",
          variants: [
            variant("linux-amd64", "Linux x64 (amd64)", latestTag),
            variant("linux-arm64", "Linux ARM64", latestTag),
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
          url: `https://github.com/${GITHUB_REPO}`,
          wget: `git clone https://github.com/${GITHUB_REPO}.git\ncd postgressively`,
        },
        {
          label: "Tarball (no git)",
          platform: "linux-amd64",
          url: `https://github.com/${GITHUB_REPO}/archive/refs/heads/main.tar.gz`,
          wget: `wget -O - https://github.com/${GITHUB_REPO}/archive/refs/heads/main.tar.gz | tar xz\ncd postgressively-main`,
        },
      ],
    };
  }

  return null;
}
