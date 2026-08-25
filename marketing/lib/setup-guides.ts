export type SetupMethod = "docker" | "pm2" | "systemd";
export type SetupOS = "windows" | "macos" | "linux" | "rpi";

export type SetupStep = {
  title: string;
  body?: string;
  code?: string;
  lang?: "bash" | "powershell" | "text";
};

export type SetupGuideContent = {
  available: boolean;
  unavailableReason?: string;
  summary: string;
  prerequisites: string[];
  steps: SetupStep[];
  notes?: string[];
  docsHref?: string;
  showHeadlessDownload?: boolean;
};

export const SETUP_METHODS: { id: SetupMethod; label: string; hint: string }[] = [
  { id: "docker", label: "Docker Compose", hint: "Full stack in containers" },
  { id: "pm2", label: "PM2 bundle", hint: "Pre-built binaries + PM2" },
  { id: "systemd", label: "Systemd", hint: "Native Linux services" },
];

export const SETUP_OS: { id: SetupOS; label: string }[] = [
  { id: "windows", label: "Windows" },
  { id: "macos", label: "macOS" },
  { id: "linux", label: "Linux" },
  { id: "rpi", label: "Raspberry Pi OS" },
];

/** Fallback when GitHub releases cannot be fetched. */
export const FALLBACK_RELEASE_TAG = "v1.1.0";

function dockerGuide(tag: string): SetupGuideContent {
  return {
    available: true,
    showHeadlessDownload: true,
    summary:
      "Runs Postgres, agent, backend, and web together. Same workflow on every OS — you only need Docker.",
    prerequisites: [
      "Docker Desktop (Windows/macOS) or Docker Engine (Linux / Pi)",
      "Docker Compose v2",
      "Download postggresively-*-docker-compose.tar.gz from the release above, or clone the repo",
    ],
    steps: [
      {
        title: "Extract the compose bundle",
        body: "Unpack the docker-compose release asset, or use the docker/ folder from a git checkout.",
        code:
          "# from a release asset\n" +
          `tar -xzf postggresively-${tag}-docker-compose.tar.gz\n` +
          "cd docker\n\n" +
          "# or from a clone\n" +
          "git clone https://github.com/workvar/postgressively.git\n" +
          "cd postgressively/docker",
        lang: "bash",
      },
      {
        title: "Configure environment",
        code:
          "cp .env.example .env\n" +
          "# Edit .env: passwords, JWT_SECRET, AGENT_TOKEN,\n" +
          "# PUBLIC_URL and BACKEND_PUBLIC_URL if browsing from another device",
        lang: "bash",
      },
      {
        title: "Start the stack",
        code: "docker compose up -d --build",
        lang: "bash",
      },
      {
        title: "Open the console",
        body: "Visit PUBLIC_URL (default http://localhost:3000). First load redirects to /setup to create your account.",
      },
      {
        title: "Day to day",
        code:
          "docker compose logs -f          # tail logs\n" +
          "docker compose restart          # after .env changes\n" +
          "docker compose down             # stop\n" +
          "docker compose down -v          # stop + wipe postgres volume",
        lang: "bash",
      },
    ],
    notes: [
      "AGENT_ALLOW_SERVICE_CONTROL is off in Docker — start/stop Postgres from the UI is unavailable, but browsing and SQL work normally.",
      "On Windows and macOS, install Docker Desktop first, then run the commands in its built-in terminal.",
    ],
    docsHref: "https://github.com/workvar/postgressively/tree/main/docker",
  };
}

function pm2ArchiveHint(os: SetupOS, tag: string): string {
  switch (os) {
    case "windows":
      return `postggresively-${tag}-windows-amd64.zip`;
    case "macos":
      return `postggresively-${tag}-darwin-arm64.tar.gz  # or darwin-amd64 on Intel Mac`;
    case "rpi":
      return (
        `postggresively-${tag}-linux-armv7.tar.gz  # Pi 3 / 32-bit OS\n` +
        `# postggresively-${tag}-linux-arm64.tar.gz on Pi 4/5 with 64-bit OS`
      );
    default:
      return `postggresively-${tag}-linux-amd64.tar.gz   # or linux-arm64 on ARM servers`;
  }
}

function pm2ExtractSteps(os: SetupOS, tag: string): string {
  if (os === "windows") {
    return (
      "# PowerShell — adjust path and version\n" +
      `Expand-Archive -Path ./postggresively-${tag}-windows-amd64.zip -DestinationPath ./postggresively\n` +
      `cd postggresively-${tag}-windows-amd64`
    );
  }
  const archive = pm2ArchiveHint(os, tag).split("\n")[0].trim();
  return `tar -xzf ${archive}\ncd postggresively-${tag}-*`;
}

function pm2Guide(os: SetupOS, tag: string): SetupGuideContent {
  return {
    available: true,
    showHeadlessDownload: true,
    summary:
      "Pre-built agent and backend binaries plus the web app, managed by PM2. Requires Node.js 18+ and a Postgres instance this machine can reach.",
    prerequisites: [
      "Node.js 18 or newer",
      "Postgres 12+ reachable from this machine (local or remote)",
      `Platform archive downloaded from the release section above (${os === "windows" ? ".zip" : ".tar.gz"})`,
    ],
    steps: [
      {
        title: "Extract the release bundle",
        code: pm2ExtractSteps(os, tag),
        lang: os === "windows" ? "powershell" : "bash",
      },
      {
        title: "Create config.json",
        code:
          "cp config.example.json config.json\n" +
          "# Set jwtSecret, agentToken, postgres* fields.\n" +
          "# Set backendUrl to an address browsers can reach\n" +
          "# (not localhost if you browse from another device).\n" +
          "# Set publicUrl to where the web UI is opened.",
        lang: "bash",
      },
      {
        title: "Build web and start services",
        code: "npm install\nnpm run setup\nnpm start",
        lang: "bash",
      },
      {
        title: "Create your console account",
        body: "Open publicUrl in a browser (default http://localhost:3000). You are redirected to /setup on first run.",
      },
      {
        title: "Day to day",
        code:
          "npm run status\n" +
          "npm run logs\n" +
          "npm run restart   # re-run npm run setup first if backendUrl changed\n" +
          "npm run stop",
        lang: "bash",
      },
    ],
    notes: [
      "backendUrl is baked into the web build at setup time — change config.json and re-run npm run setup if it moves.",
      "Run pm2 startup (see PM2 docs for your OS) so processes return after reboot. npm start already runs pm2 save.",
      ...(os === "rpi"
        ? ["On Raspberry Pi, prefer the armv7 archive for 32-bit Pi OS, arm64 for 64-bit Pi OS / Pi 4+."]
        : []),
    ],
    docsHref: "https://github.com/workvar/postgressively/tree/main/release",
  };
}

function systemdGuide(os: SetupOS): SetupGuideContent {
  if (os === "windows" || os === "macos") {
    return {
      available: false,
      unavailableReason:
        "Systemd units are Linux-only. On Windows or macOS, use the PM2 release bundle or Docker Compose instead.",
      summary: "",
      prerequisites: [],
      steps: [],
    };
  }

  return {
    available: true,
    showHeadlessDownload: true,
    summary:
      "Build from source and run agent, backend, and web as user-level systemd services — no root required. Best for a dedicated Linux server or Pi you manage with git.",
    prerequisites: [
      "Linux with systemd (includes Raspberry Pi OS)",
      "Go 1.21+, Node.js 18+, npm",
      "Postgres 12+ reachable from this machine",
      "Git checkout of the repository (not the PM2 tarball)",
    ],
    steps: [
      {
        title: "Clone and configure",
        code:
          "git clone https://github.com/workvar/postgressively.git\n" +
          "cd postgressively\n" +
          "cp agent/.env.example agent/.env\n" +
          "cp backend/.env.example backend/.env\n" +
          "# Fill in real secrets and PG_DATABASE_URL — deploy refuses placeholder values",
        lang: "bash",
      },
      {
        title: "Set the public backend URL (if remote)",
        body: "If you open the console from another device, export the address browsers use before deploying.",
        code:
          "# example — use your server's LAN IP or domain\n" +
          "export POSTGGRESIVELY_BACKEND_URL=http://192.168.1.50:8080",
        lang: "bash",
      },
      {
        title: "Deploy all three services",
        code: "./scripts/deploy.sh",
        lang: "bash",
      },
      {
        title: "Survive reboots and logout",
        code: "loginctl enable-linger $USER\n# services stay up after you disconnect",
        lang: "bash",
      },
      {
        title: "Open the console",
        body: "Browse to the web port (default http://localhost:3000) and complete /setup.",
      },
      {
        title: "Day to day",
        code:
          "systemctl --user status postggresively-agent postggresively-backend postggresively-web\n" +
          "journalctl --user -u postggresively-backend -f\n" +
          "systemctl --user restart postggresively-web",
        lang: "bash",
      },
    ],
    notes: [
      os === "rpi"
        ? "On Raspberry Pi, build natively on the device — Go cross-compiles are not required when deploying from the Pi itself."
        : "Re-run ./scripts/deploy.sh after git pull to rebuild and restart.",
      "Units install to ~/.config/systemd/user/ — no sudo needed for the console itself.",
    ],
    docsHref: "https://github.com/workvar/postgressively/tree/main/deploy",
  };
}

export function getSetupGuide(
  method: SetupMethod,
  os: SetupOS,
  latestTag: string = FALLBACK_RELEASE_TAG,
): SetupGuideContent {
  const tag = latestTag.trim() || FALLBACK_RELEASE_TAG;
  if (method === "docker") return dockerGuide(tag);
  if (method === "pm2") return pm2Guide(os, tag);
  return systemdGuide(os);
}

export function detectSetupOS(): SetupOS {
  if (typeof window === "undefined") return "linux";
  const ua = navigator.userAgent.toLowerCase();
  const platform = navigator.platform?.toLowerCase() ?? "";
  if (ua.includes("win")) return "windows";
  if (platform.includes("mac") || ua.includes("mac")) return "macos";
  if (ua.includes("arm") && (ua.includes("linux") || platform.includes("linux"))) return "rpi";
  return "linux";
}

export function isMethodAvailable(method: SetupMethod, os: SetupOS): boolean {
  return getSetupGuide(method, os).available;
}
