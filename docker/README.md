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

## Updates

The console's **Help → Updates** page checks GitHub Releases. For Docker,
auto-update needs the Docker CLI inside the agent container **and** a
`docker.sock` mount (commented out in `docker-compose.yml` by default).
Without that, the page shows the `docker compose pull && up -d` commands
to run on the host. Set `POSTGGRESSIVELY_VERSION` to a release tag (e.g.
`v1.2.3`) when pulling published `ghcr.io/workvar/postggresively-*` images.

## Analytics

There is nothing to configure here -- no `.env` entry, no build arg you're
expected to set. GA4 (`internal/telemetry`) and Microsoft Clarity
(`web/lib/clarity.ts`) credentials are baked into images at *build* time via
`-ldflags`/`NEXT_PUBLIC_CLARITY_PROJECT_ID`, sourced from GitHub Actions
repository configuration, never from an environment variable an operator
sets:

- `docker/Dockerfile.backend` accepts `VERSION`, `GA_MEASUREMENT_ID`,
  `GA_API_SECRET`, and `GH_BUG_TOKEN` build args, all blank/`dev` by
  default.
- `docker/Dockerfile.web` accepts `NEXT_PUBLIC_CLARITY_PROJECT_ID`, blank by
  default.

A plain `docker compose up -d --build` here never passes any of those --
every image it builds locally has telemetry and bug reporting fully inert,
regardless of what's set anywhere in GitHub. Only
`.github/workflows/release.yml`, running in the repo's own CI on a tag push,
passes real values, read from **Settings > Secrets and variables > Actions**:
`GA_MEASUREMENT_ID` and `CLARITY_PROJECT_ID` as repository *variables*
(neither is really secret -- both end up in outbound request URLs or a
public `<script src>`), `GA_API_SECRET` and `GH_BUG_TOKEN` as repository
*secrets*. `GH_BUG_TOKEN` needs `issues: write` on
`workvar/postgressively` so Account → Report a bug can open Issues. Those
land in the published `ghcr.io/${{ github.repository_owner }}/postggresively-{backend,web}`
images -- which this compose file never pulls (it always builds), so they
only matter if you `docker pull` and run one of those images directly.

Whatever ends up baked in, or not: an operator can always turn telemetry off
entirely from the console's Account page, or by dropping the
`backend-data` volume that holds the local queue and preferences.
