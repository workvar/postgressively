# In-app updates (PM2 + Docker) — Design

**Date:** 2026-08-24  
**Status:** Approved

## Goal

Signed-in operators see when a newer GitHub Release exists and can apply it from the console (notify + in-app auto-update) for both the PM2 release bundle and Docker Compose installs.

## Product

- Banner when `latest > current` (official builds; `dev` does not claim an update).
- Help → Updates page: current vs latest, notes, Update now / fallback commands.
- Apply requires step-up; audit `update.applied`.
- Progress: downloading → applying → restarting; brief disconnect expected.
- Docker without Docker socket: notify + copy-paste commands only (`canAutoUpdate=false`).

## Install detection

Env (set by packaging, not guessed):

| Variable | Values | Purpose |
|---|---|---|
| `PG_INSTALL_KIND` / `AGENT_INSTALL_KIND` | `pm2` \| `docker` \| empty | Install mode |
| `PG_INSTALL_ROOT` / `AGENT_INSTALL_ROOT` | absolute path | Bundle or compose project dir |

`GET /api/updates` returns `{ current, latest, kind, canAutoUpdate, reason?, notes?, htmlUrl?, commands? }`.

## Security

- Status: authenticated. Apply: elevated + audit.
- Downloads only from `https://github.com/workvar/postgressively/releases/...`.
- Writes only under install root (stage then swap).
- One apply in flight; refuse concurrent applies.
- Docker auto-update requires usable Docker CLI + socket; optional sock mount on agent, off by default.

## Architecture

- **Backend:** check GitHub Releases (cached ~1h), expose status/apply/status-poll APIs, proxy apply to agent.
- **Agent:** perform PM2 or Docker update; expose async job status.
- **Web:** banner + Updates page.

### PM2 apply

1. Resolve platform asset for `GOOS`/`GOARCH`.
2. Download release archive for requested tag.
3. Extract to staging under install root.
4. Replace `bin/` and `web/` (preserve `config.json`, `data/`, `backups/`).
5. `npm run setup` then `pm2 restart ecosystem.config.js`.

### Docker apply

1. If Docker unavailable → return commands (`docker compose pull && up -d` with image tags).
2. Else set image tags to release tag, `docker compose pull && up -d` in install root.

## Out of scope (v1)

Git/`deploy.sh` installs, rollback UI, beta channel, Windows beyond existing PM2 zip.
