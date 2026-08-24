// PM2 process file for the Postggresively release bundle.
// Start with: npm run setup && npm start   (see README.md in this folder)

const fs = require("fs");
const path = require("path");

const configPath = path.join(__dirname, "config.json");
if (!fs.existsSync(configPath)) {
  console.error("config.json not found. Copy config.example.json to config.json and edit it first.");
  process.exit(1);
}
const cfg = JSON.parse(fs.readFileSync(configPath, "utf8"));

const isWin = process.platform === "win32";
const binPath = (name) => path.join(__dirname, "bin", isWin ? `${name}.exe` : name);

const publicUrl = cfg.publicUrl ?? "http://localhost:3000";
const rpid = (() => {
  try {
    return new URL(publicUrl).hostname;
  } catch {
    return "localhost";
  }
})();

const databaseUrl =
  cfg.postgresUrl ??
  `postgres://${cfg.postgresUser}:${cfg.postgresPassword}@${cfg.postgresHost}:${cfg.postgresPort}/${cfg.postgresDatabase}`;

module.exports = {
  apps: [
    {
      name: "postggresively-agent",
      script: binPath("postggresively-agent"),
      cwd: __dirname,
      env: {
        AGENT_ADDR: `127.0.0.1:${cfg.agentPort ?? 8081}`,
        AGENT_TOKEN: cfg.agentToken,
        AGENT_PG_SERVICE: cfg.postgresServiceName ?? "postgresql",
        // auto probes systemctl, then brew, then pg_ctl -- whatever manages
        // Postgres on this machine.
        AGENT_SERVICE_MANAGER: cfg.serviceManager ?? "auto",
        AGENT_BACKUP_DIR: cfg.backupDir ?? path.join(__dirname, "backups"),
        AGENT_PG_HOST: cfg.postgresHost ?? "127.0.0.1",
        AGENT_PG_PORT: String(cfg.postgresPort ?? 5432),
        AGENT_PG_USER: cfg.postgresUser ?? "postgres",
        AGENT_ALLOW_SERVICE_CONTROL: String(cfg.allowServiceControl ?? true),
      },
    },
    {
      name: "postggresively-backend",
      script: binPath("postggresively-backend"),
      cwd: __dirname,
      env: {
        PG_ADDR: `:${cfg.backendPort ?? 8080}`,
        PG_DATABASE_URL: databaseUrl,
        PG_META_DATABASE: cfg.metaDatabase ?? "postggresively",
        PG_JWT_SECRET: cfg.jwtSecret,
        PG_SECRET_KEY: cfg.secretKey ?? "",
        PG_AGENT_URL: `http://127.0.0.1:${cfg.agentPort ?? 8081}`,
        PG_AGENT_TOKEN: cfg.agentToken,
        PG_CORS_ORIGIN: publicUrl,
        PG_READ_ONLY: String(cfg.readOnly ?? false),
        PG_WEBAUTHN_RPID: rpid,
        PG_WEBAUTHN_NAME: "Postggresively",
        PG_WEBAUTHN_ORIGINS: publicUrl,
        PG_DATA_DIR: path.join(__dirname, "data"),
        // No GA4 env vars here: bin/postggresively-backend already has its
        // analytics credentials baked in at build time (see
        // backend/internal/telemetry/baked.go and .github/workflows/release.yml).
      },
    },
    {
      name: "postggresively-web",
      script: "server.js",
      // `npm run setup` builds this via build-web.mjs (output: "standalone").
      cwd: path.join(__dirname, "web", ".next", "standalone"),
      env: {
        PORT: String(cfg.webPort ?? 3000),
        HOSTNAME: "0.0.0.0",
      },
    },
  ],
};
