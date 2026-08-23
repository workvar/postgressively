#!/usr/bin/env bash
#
# Starts all three Postggresively services (agent, backend, web) with one
# command instead of three shells. Mirrors `make agent` / `make backend` /
# `make web`, but launches them together, in dependency order, and tears
# every one of them down on Ctrl+C.
#
#   agent (127.0.0.1:8081, private) -> backend (:8080, proxies to agent) -> web (:3000)
#
# Usage: scripts/dev.sh

set -euo pipefail
set -m # each background job gets its own process group, so we can kill it and its children together

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

# ---- small helpers ---------------------------------------------------------

log() { printf '[dev] %s\n' "$1"; }

# Reads KEY=VALUE out of an env file without sourcing it. Falls back to a
# default when the file or key is missing.
env_var() {
  local file=$1 key=$2 default=$3 val
  val=$(grep -E "^${key}=" "$file" 2>/dev/null | tail -n1 | cut -d= -f2-)
  printf '%s' "${val:-$default}"
}

# Copies KEY.env.example -> KEY.env the first time this script runs, same as
# the "Quick start" section in the README.
ensure_env_file() {
  local example=$1 real=$2
  if [[ ! -f "$real" && -f "$example" ]]; then
    cp "$example" "$real"
    log "created $real from $(basename "$example") (edit it before relying on defaults)"
  fi
}

# Blocks until something is listening on host:port, or times out.
wait_for_port() {
  local host=$1 port=$2 label=$3 timeout_s=${4:-20}
  local waited=0
  while ! (exec 3<>"/dev/tcp/${host}/${port}") 2>/dev/null; do
    exec 3<&- 3>&- 2>/dev/null || true
    waited=$((waited + 1))
    if (( waited >= timeout_s * 2 )); then
      log "timed out waiting for $label on $host:$port"
      return 1
    fi
    sleep 0.5
  done
  exec 3<&- 3>&- 2>/dev/null || true
}

# Runs a command as a background job with its output prefixed and colored,
# and records the job's PID so cleanup() can kill the whole process group.
PIDS=()
run_service() {
  local label=$1 color=$2 dir=$3
  shift 3
  (
    cd "$dir"
    "$@" 2>&1 | sed -u "s/^/${color}[${label}]\033[0m /"
  ) &
  PIDS+=("$!")
}

cleanup() {
  trap - INT TERM EXIT
  log "shutting down..."
  for pid in "${PIDS[@]:-}"; do
    kill -TERM "-${pid}" 2>/dev/null || true
  done
  wait 2>/dev/null || true
}
trap cleanup INT TERM EXIT

# ---- env files --------------------------------------------------------------

ensure_env_file agent/.env.example agent/.env
ensure_env_file backend/.env.example backend/.env
ensure_env_file web/.env.local.example web/.env.local

# ---- start in dependency order: agent -> backend -> web --------------------

AGENT_ADDR=$(env_var agent/.env AGENT_ADDR "127.0.0.1:8081")
AGENT_HOST=${AGENT_ADDR%%:*}
AGENT_PORT=${AGENT_ADDR##*:}

BACKEND_ADDR=$(env_var backend/.env PG_ADDR ":8080")
BACKEND_PORT=${BACKEND_ADDR##*:}
BACKEND_HOST=${BACKEND_ADDR%%:*}
BACKEND_HOST=${BACKEND_HOST:-127.0.0.1}

log "starting agent on $AGENT_ADDR"
run_service agent '\033[36m' "$ROOT_DIR/agent" bash -c 'set -a && . ./.env && set +a && exec go run ./cmd/agent'
wait_for_port "$AGENT_HOST" "$AGENT_PORT" agent || { cleanup; exit 1; }

log "starting backend on $BACKEND_ADDR (proxies privileged calls to the agent)"
run_service backend '\033[35m' "$ROOT_DIR/backend" bash -c 'set -a && . ./.env && set +a && exec go run ./cmd/server'
wait_for_port "$BACKEND_HOST" "$BACKEND_PORT" backend || { cleanup; exit 1; }

log "starting web on :3000"
run_service web '\033[32m' "$ROOT_DIR/web" npm run dev

log "all three services are up. Ctrl+C stops all of them."
wait
