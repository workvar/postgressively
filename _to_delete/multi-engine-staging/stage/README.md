# Postggresively

A web console for the Postgres instance running on your server. Three pieces:

| Component | Stack | Role |
| --- | --- | --- |
| `agent/` | Go, stdlib only | Runs on the DB host. Controls the systemd unit, reads host stats and logs, runs `pg_dump`. Binds to localhost. |
| `backend/` | Go, pgx + JWT | Public API. Auth, schema introspection, query execution, proxies privileged calls to the agent. |
| `web/` | Next.js 14 (App Router) + Tailwind | UI: overview, schema browser, SQL console, server control. |

## Why the split

The agent is the only component that touches the operating system. It holds no
database credentials of its own beyond the local socket user and it never
accepts requests from outside the host. The backend is the only component that
speaks SQL, and it is the only thing exposed to the browser. That means you can
lock the agent down (`AGENT_ADDR=127.0.0.1:8081`) and still run the backend and
UI on a different port, behind TLS.

## Quick start (local dev)

```bash
# 1. agent
cp agent/.env.example agent/.env
make agent

# 2. backend (new shell)
cp backend/.env.example backend/.env
make backend

# 3. web (new shell)
cd web && npm install
cp .env.local.example .env.local
npm run dev
```

Open http://localhost:3000. On a fresh database the app redirects to `/setup`,
where you pick the console username and password.

## The console database

On first boot the backend creates its own database, `postggresively`
(`PG_META_DATABASE`), on the same server and keeps everything about itself
there: accounts and bcrypt password hashes, registered passkeys, saved queries,
settings and an audit log. Nothing is written into the operator's own
databases. Installs that predate this layout kept accounts in a
`postggresively` schema inside `PG_DATABASE_URL`'s database; those are copied
across automatically on the next start, and the old table is left in place so
you can verify before dropping it.

Locked out? Clear the accounts and the wizard runs again on next load:

```sql
-- connected to the postggresively database
DELETE FROM users;
```

## Other databases

The console starts out pointed at the Postgres instance it was installed next
to. Any other relational database can be added from **Connections** by pasting
a connection string:

| Engine | Connection string |
| --- | --- |
| PostgreSQL (remote) | `postgres://user:password@host:5432/dbname?sslmode=require` |
| MySQL / MariaDB | `mysql://user:password@host:3306/dbname?tls=true` |
| SQLite | `/var/lib/app/data.db` |
| SQL Server | `sqlserver://user:password@host:1433?database=dbname&encrypt=true` |

The string is dialled and read once before it is saved, so a typo fails in the
form rather than later. It is then encrypted with AES-256-GCM under a key
derived from `PG_SECRET_KEY` (falling back to `PG_JWT_SECRET`, so an existing
install needs no new variable) and stored in the `connections` table of the
console database. Only the redacted form is ever sent back to the browser.

The sidebar switcher chooses which connection the data pages read, and every
browsing request carries `?conn=<id>`; `local` is the built-in instance.

What each engine supports:

- **PostgreSQL**, local or remote: everything, including the row editor.
- **MySQL / MariaDB, SQLite, SQL Server**: databases, tables, columns,
  indexes, row previews, autocomplete and the SQL console. The row editor and
  the server-administration pages stay Postgres-only and answer `501`.

Rotating `PG_SECRET_KEY` makes existing saved connections undecryptable; they
have to be added again.

## Passkeys and critical actions

Register a passkey from the account page, then sign in with it from the login
screen, no username needed. Passkeys need a secure context, so the UI must be
on HTTPS or localhost, and `PG_WEBAUTHN_RPID` must match the domain it is
served from.

Destructive actions are gated behind a second confirmation: dropping a
database, deleting rows from the grid, terminating a backend, and removing a
passkey. The confirmation mints a five-minute token (passkey or password) that
the browser sends in `X-Elevated-Token`; the session token alone is never
enough. Every confirmation and every action it unlocks is recorded in the audit
log.

## API surface

```
GET    /api/setup/status                       -> { needsSetup }   (public)
POST   /api/setup                              -> { token }        (public, first run only)
POST   /api/login                              -> { token }
GET    /api/me
POST   /api/account/password                   -> { token }
POST   /api/login/passkey/{begin,finish}       -> { token }        (public)
GET    /api/passkeys
POST   /api/passkeys/register/{begin,finish}
PATCH  /api/passkeys/{id}
DELETE /api/passkeys/{id}                                          (step-up)
POST   /api/stepup/password                    -> { elevatedToken }
POST   /api/stepup/passkey/{begin,finish}      -> { elevatedToken }
GET    /api/audit
GET    /api/engines                            -> supported engines
GET    /api/connections
POST   /api/connections                        -> { name, engine, dsn }
POST   /api/connections/test                   -> dial without saving
PATCH  /api/connections/{id}
DELETE /api/connections/{id}                                       (step-up)
GET    /api/databases
GET    /api/tables
GET    /api/tables/{schema}/{table}            -> columns + indexes
GET    /api/tables/{schema}/{table}/rows       -> preview rows
POST   /api/tables/{schema}/{table}/rows       -> apply grid edits
GET    /api/completions                        -> autocomplete catalog
POST   /api/query                              -> { sql, db } multi-statement
GET    /api/activity
POST   /api/activity/{pid}/terminate
GET    /api/agent/status | /stats | /logs
POST   /api/agent/service/{start|stop|restart|reload}
GET    POST /api/agent/backups
```

## Safety rails in v1

- `PG_READ_ONLY=true` rejects any statement starting with a write verb, blocks
  `pg_terminate_backend`, and blocks service control.
- Every query runs with `statement_timeout` set from `PG_QUERY_TIMEOUT_SECONDS`
  and results are capped at `PG_MAX_ROWS` (the response flags `truncated`).
- Table and schema names from URLs are quoted as identifiers before
  interpolation; row previews never take raw SQL from the client.
- The agent validates database names against `^[A-Za-z0-9_-]{1,63}$` before
  passing them to `pg_dump`, and only accepts four fixed systemd actions.
- Agent auth is a constant-time comparison against a 32+ character token.

## Production deploy

```bash
make build
sudo install bin/postggresively-agent bin/postggresively-backend /usr/local/bin/
sudo mkdir -p /etc/postggresively
# copy the two .env files to /etc/postggresively/{agent,backend}.env, chmod 600
sudo cp deploy/*.service /etc/systemd/system/
sudo systemctl enable --now postggresively-agent postggresively-backend
```

The agent needs privileges to run `systemctl` on the Postgres unit and to write
to `AGENT_BACKUP_DIR`. Running it as root is the simple path; a tighter setup is
a dedicated user plus a polkit rule or a narrow sudoers entry.

Put the backend behind a reverse proxy with TLS. Serve the Next.js app from the
same origin, or set `PG_CORS_ORIGIN` to the UI's exact origin.

## Known gaps for v2

- Single account. The schema is shaped for multi-user, but there are no roles
  and no create/list/delete API for accounts.
- JWTs are not revocable, so an old session token stays valid until it expires
  (12h) even after a password change.
- WebAuthn challenges are held in memory, so a multi-process deployment needs
  sticky routing for the two-call ceremony.
- Grid editing needs a primary key; relations without one stay read-only.
- Only Postgres has a row editor. MySQL, SQLite and SQL Server connections are
  read and query only.
- Saved connections are shared by every account, and there is no per-connection
  permission model.
- No `pg_restore` path yet, and no backup retention or scheduling.
- No streaming for large result sets; everything is materialized in memory.
- The read-only guard is a regex over statements, not a Postgres-level
  `default_transaction_read_only` session. Use a read-only DB role for hard
  guarantees.
