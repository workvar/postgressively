# In-app Updates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Notify operators of new GitHub Releases and apply PM2 or Docker updates in-app via the agent.

**Architecture:** Backend checks GitHub and gates apply behind step-up; agent performs download/swap/restart (PM2) or compose pull/up (Docker); web shows banner + Updates page.

**Tech Stack:** Go (backend/agent), Next.js (web), GitHub Releases API, PM2, Docker Compose.

**Spec:** `docs/superpowers/specs/2026-08-24-in-app-updates-design.md`

## Global Constraints

- Repo fixed: `workvar/postgressively`.
- Secret/env naming: install kind via `PG_INSTALL_KIND` / `AGENT_INSTALL_KIND`.
- Destructive apply uses `requireElevated`.
- No commits unless the user asks.

## File map

| Path | Role |
|---|---|
| `backend/internal/updates/` | GitHub latest check, semver compare, cache |
| `backend/internal/api/update_handlers.go` | `/api/updates*` |
| `backend/internal/config/config.go` | `InstallKind`, `InstallRoot` |
| `backend/internal/agentclient/client.go` | UpdateApply / UpdateStatus |
| `agent/internal/update/` | PM2 + Docker apply + job status |
| `agent/internal/config/config.go` | Install kind/root |
| `agent/internal/httpapi/routes.go` | `/v1/update/*` |
| `web/app/updates/page.tsx` | Updates UI |
| `web/components/updates/` | Banner + form |
| `release/ecosystem.config.js` | Set install env |
| `docker/docker-compose.yml` | Install env + optional sock docs |

---

### Task 1: Backend updates package (check + compare)

- [x] Write tests for semver/`v` tag compare and “dev never updates”
- [x] Implement `updates.Checker` with injectable HTTP + 1h cache
- [x] `go test ./internal/updates/`

### Task 2: Backend API + config

- [x] Add `InstallKind` / `InstallRoot` to config
- [x] `GET /api/updates`, `POST /api/updates/apply` (elevated), `GET /api/updates/status`
- [x] Wire agentclient methods
- [x] Expose `version` on `/api/me` or updates only (prefer updates payload)

### Task 3: Agent updater

- [x] Tests for platform asset name + path confinement helpers
- [x] Async job: apply PM2 (download/extract/swap/setup/restart) and Docker (pull/up or commands)
- [x] Routes `POST /v1/update/apply`, `GET /v1/update/status`
- [x] Config: `AGENT_INSTALL_KIND`, `AGENT_INSTALL_ROOT`

### Task 4: Packaging env

- [x] PM2 ecosystem sets kind=pm2 and install root
- [x] Docker compose sets kind=docker; document optional docker.sock on agent
- [x] Prefer image tags for published stack pull (document `POSTGGRESSIVELY_VERSION`)

### Task 5: Web UI

- [x] `/updates` page + nav Help item
- [x] Session-dismissible banner in Shell when update available
- [x] Step-up apply + poll status

### Task 6: Verify

- [x] `go test` backend + agent packages
- [x] `tsc --noEmit` / lint on touched web files
