# Docker Compose

```bash
cp .env.example .env
# edit .env: passwords, JWT_SECRET, AGENT_TOKEN, and PUBLIC_URL/BACKEND_PUBLIC_URL
# if you're not accessing this from the same machine Docker runs on.

docker compose up -d --build
```

Runs Postgres, `agent`, `backend`, and `web` together (see `docker-compose.yml`).
Open `PUBLIC_URL` (`http://localhost:3000` by default) once it's up; first
load redirects to `/setup`.

`AGENT_ALLOW_SERVICE_CONTROL` is off in this stack -- a container can't reach
the host's systemd/brew/pg_ctl, so the UI's service start/stop/restart
controls are unavailable. Browsing, querying, and row editing are unaffected.
This is the same `AGENT_ALLOW_SERVICE_CONTROL` flag documented in
`agent/.env.example` in the main repo, not Docker-specific behavior.

`docker compose logs -f`, `docker compose down`, `docker compose down -v`
(also drops the `postgres-data` volume) work as usual.
