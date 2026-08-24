#!/usr/bin/env bash
#
# Production counterpart to scripts/dev.sh, for a Linux server with systemd.
# Builds all three services and runs them as *user* systemd units under
# whichever account runs this script -- no root, no dedicated system user,
# nothing installed outside this checkout. Same dependency order as dev.sh:
# agent, then backend (which proxies privileged calls to it), then web.
#
# Run from the server, from this repo checkout, as the account you want the
# services to run as:
#   ./scripts/deploy.sh
#
# Re-running it after a `git pull` rebuilds and restarts all three.
#
# This does NOT generate secrets. agent/.env and backend/.env must already
# exist (copy them from *.env.example and fill in real values) -- this
# script refuses to run rather than deploy placeholder tokens.
#
# Not on Linux, or don't want systemd? See release/ for the cross-platform
# PM2 bundle, or docker/ for the Docker Compose stack -- both are built by
# .github/workflows/release.yml on every tag push.

set -euo pipefail

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

UNIT_DIR="$HOME/.config/systemd/user"

log() { printf '[deploy] %s\n' "$1"; }
die() { printf '[deploy] error: %s\n' "$1" >&2; exit 1; }

# ---- preflight ---------------------------------------------------------

require_file() {
  local f=$1 hint=$2
  [[ -f "$f" ]] || die "$f is missing. $hint"
}

require_file agent/.env "cp agent/.env.example agent/.env and fill in real values."
require_file backend/.env "cp backend/.env.example backend/.env and fill in real values."

command -v go >/dev/null || die "go is not on PATH"
command -v node >/dev/null || die "node is not on PATH"
command -v npm >/dev/null || die "npm is not on PATH"
command -v systemctl >/dev/null || die "systemctl is not available on this host (see release/ or docker/ instead)"

# ---- build ---------------------------------------------------------------

log "building agent and backend"
mkdir -p bin
(cd backend && CGO_ENABLED=0 go build -o ../bin/postggresively-backend ./cmd/server)
(cd agent && CGO_ENABLED=0 go build -o ../bin/postggresively-agent ./cmd/agent)

env_var() {
  local file=$1 key=$2 default=$3 val
  val=$(grep -E "^${key}=" "$file" 2>/dev/null | tail -n1 | cut -d= -f2-)
  printf '%s' "${val:-$default}"
}

BACKEND_PORT=$(env_var backend/.env PG_ADDR ":8080")
BACKEND_PORT=${BACKEND_PORT##*:}

# The browser calls this URL directly, so 127.0.0.1 only works when the
# browser runs on this same machine. Export POSTGGRESIVELY_BACKEND_URL
# before running this script to point it at this server's real address
# (e.g. https://db.example.com) if you're accessing it remotely.
#
# POSTGGRESIVELY_CLARITY_PROJECT_ID (optional) works the same way: export it
# before running this script to build in Microsoft Clarity for the web UI.
# Left unset, web ships without it.
BACKEND_URL="${POSTGGRESIVELY_BACKEND_URL:-http://127.0.0.1:${BACKEND_PORT}}"
log "building web (NEXT_PUBLIC_API_URL=$BACKEND_URL; override with POSTGGRESIVELY_BACKEND_URL)"
POSTGGRESIVELY_BACKEND_URL="$BACKEND_URL" node scripts/build-web.mjs

# ---- install unit files ---------------------------------------------------

log "installing user systemd units to $UNIT_DIR"
mkdir -p "$UNIT_DIR"
for svc in agent backend web; do
  sed "s#__ROOT__#$ROOT_DIR#g" "deploy/postggresively-$svc.service" > "$UNIT_DIR/postggresively-$svc.service"
done
systemctl --user daemon-reload

# ---- start, in dependency order -------------------------------------------

wait_for_active() {
  local svc=$1 timeout_s=${2:-20} waited=0
  while ! systemctl --user is-active --quiet "$svc"; do
    waited=$((waited + 1))
    if (( waited >= timeout_s * 2 )); then
      die "$svc did not become active in time. Check: journalctl --user -u $svc -e"
    fi
    sleep 0.5
  done
}

start_service() {
  local svc=$1
  log "starting $svc"
  systemctl --user enable "$svc" >/dev/null
  systemctl --user restart "$svc"
  wait_for_active "$svc"
}

start_service postggresively-agent
start_service postggresively-backend
start_service postggresively-web

log "all three services are up:"
systemctl --user --no-pager --plain status postggresively-agent postggresively-backend postggresively-web | grep -E "●|Active:"

log "tip: 'loginctl enable-linger $USER' keeps these running after you log out / across reboots."
