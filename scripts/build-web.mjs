#!/usr/bin/env node
//
// Builds `web` into a self-contained bundle (Next.js `output: "standalone"`)
// and points it at a backend URL supplied by the caller. Shared by:
//   - scripts/deploy.sh          (systemd path, repo checked out on the server)
//   - release/package.json       (the PM2 release bundle's `npm run setup`)
//
// NEXT_PUBLIC_API_URL is inlined into the browser bundle at build time by
// Next.js, so it cannot be changed by an env var at runtime. That's why this
// runs as an explicit build step instead of something ecosystem.config.js or
// a systemd unit could do on its own -- both of those only control the env
// of an already-built process, which is too late for a NEXT_PUBLIC_* value.
//
// Usage:
//   POSTGGRESIVELY_BACKEND_URL=https://db.example.com:8080 node build-web.mjs
//
// POSTGGRESIVELY_BACKEND_URL must be reachable from the browser, not just
// from the server -- it's the address the UI's JavaScript calls directly.
// Defaults to http://127.0.0.1:8080, which only works when the browser and
// the backend are on the same machine.

import { existsSync, cpSync, writeFileSync, rmSync, readFileSync } from "node:fs";
import { execSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));

// Works whether this file sits next to `web/` (release bundle layout) or one
// directory above it (repo layout, scripts/build-web.mjs + ../web).
function findWebDir() {
  for (const candidate of [path.join(scriptDir, "web"), path.join(scriptDir, "..", "web")]) {
    if (existsSync(path.join(candidate, "package.json"))) return candidate;
  }
  throw new Error("could not find a web/ directory next to or above build-web.mjs");
}

// In the release bundle there's a config.json (see config.example.json)
// sitting next to this script; scripts/deploy.sh has no such file and passes
// the URL via env instead. Env always wins when both are present.
function backendUrlFromConfig() {
  const configPath = path.join(scriptDir, "config.json");
  if (!existsSync(configPath)) return undefined;
  try {
    return JSON.parse(readFileSync(configPath, "utf8")).backendUrl;
  } catch {
    return undefined;
  }
}

const webDir = findWebDir();
const backendUrl = process.env.POSTGGRESIVELY_BACKEND_URL ?? backendUrlFromConfig() ?? "http://127.0.0.1:8080";

console.log(`[build-web] web dir: ${webDir}`);
console.log(`[build-web] NEXT_PUBLIC_API_URL: ${backendUrl}`);

writeFileSync(path.join(webDir, ".env.production"), `NEXT_PUBLIC_API_URL=${backendUrl}\n`);

const run = (cmd) => execSync(cmd, { cwd: webDir, stdio: "inherit", shell: true });

if (!existsSync(path.join(webDir, "node_modules"))) {
  console.log("[build-web] installing dependencies (npm ci)");
  run("npm ci");
} else {
  console.log("[build-web] node_modules already present, skipping install");
}

console.log("[build-web] building (npm run build)");
run("npm run build");

// `output: "standalone"` doesn't copy static assets or public/ in on its
// own -- https://nextjs.org/docs/app/api-reference/config/next-config-js/output
const standaloneDir = path.join(webDir, ".next", "standalone");
if (!existsSync(standaloneDir)) {
  throw new Error(`expected ${standaloneDir} after build -- is output: "standalone" set in next.config.mjs?`);
}

const staticSrc = path.join(webDir, ".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");
rmSync(staticDest, { recursive: true, force: true });
cpSync(staticSrc, staticDest, { recursive: true });

const publicSrc = path.join(webDir, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, path.join(standaloneDir, "public"), { recursive: true });
}

console.log(`[build-web] done: ${path.join(standaloneDir, "server.js")}`);
