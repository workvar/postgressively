# Project conventions

Standing rules for this repo. Apply them to every change, including future features.

## UI

### Dropdowns must be searchable

Never use a native `<select>` element. All single-choice dropdowns use
`web/components/ui/Combobox.tsx`, which renders a text input with type-ahead
filtering, keyboard navigation, and a styled option list.

```tsx
import Combobox from "@/components/ui/Combobox";

<Combobox
  aria-label="Database"
  options={items.map((d) => ({ value: d.name, label: d.name, hint: bytes(d.size) }))}
  value={value}
  onChange={setValue}
  placeholder="Search databases…"
  emptyText="No databases match"
/>
```

- `hint` is secondary text shown under the label; it is also matched by the search.
- Wrap in `<Field label="…">` inside forms.
- The native `Select` export was removed from `components/ui/Field.tsx` on purpose.
  If a new picker is needed, extend `Combobox` rather than reintroducing `<select>`.

### Other UI rules

- Reuse the primitives in `web/components/ui/` (`Button`, `Field`, `Panel`, `Tabs`,
  `Table`, `Badge`) instead of hand-rolling styles.
- Colors, spacing, and easing come from Tailwind tokens defined in
  `web/tailwind.config.ts` (`fg`, `surface`, `line`, `accent`, `ease-apple`, …).
  Do not hardcode hex values.

## Code layout

- Keep files small and single-purpose. Split page logic into feature folders under
  `web/components/<feature>/` and data fetching into `web/lib/`.
- Backend handlers stay thin; Postgres logic lives in `backend/internal/pg/`, and
  the other engines in `backend/internal/engine/`.

## The console's own state

Accounts, passkeys, saved queries, settings and the audit log live in a
separate database, `PG_META_DATABASE` (default `postggresively`), created at
boot by `pg.OpenMeta`. Reach it through `Server.meta`, never `Server.store`.
Nothing the console needs for itself may be written into a database the
operator uses. New state goes in `metaSchemaDDL`
(`backend/internal/pg/metaschema.go`), which is applied idempotently on
every start.

## Critical actions need step-up

Anything destructive sits behind `Server.requireElevated`: dropping a database,
deleting rows, terminating a backend, removing a passkey. The caller must send
a session token plus a five-minute `X-Elevated-Token`, minted by
`/api/stepup/*` after a passkey or password check. On the web side nothing
special is needed: `lib/api.ts` sees the `needsStepUp` response, raises the
dialog from `components/security/StepUpGate.tsx`, and retries the request.
Record the action with `Server.audit` once it succeeds.

## Other engines

`internal/model` holds the value types every engine returns, so a MySQL or
SQLite connection produces the same JSON as Postgres. `internal/engine` is the
`database/sql` layer for the non-Postgres engines: one small `dialect_*.go` per
engine supplies the SQL text and quoting, and everything that runs statements
and scans rows is shared. Adding an engine means adding a descriptor in
`kind.go`, a `dialect_*.go`, and a driver import in `conn.go`.

Saved connections live in `internal/conns`: `store.go` is the CRUD against the
console database, `registry.go` pools one `Source` per connection and database.
A Postgres connection is served by `internal/pg` even when it is remote, so it
keeps the row editor.

Handlers reach a database through `Server.sourceFor(r)`, which honours both
`?conn=` and `?db=`. Use `Server.storeFor(r)` only for Postgres-only features;
it returns `errNotPostgres`, which `writePostgresOnly` reports as `501`.

Connection strings are encrypted, never hashed, by `internal/secrets`. Never
log one, and never return anything but `engine.Redact` output to the client.

## Multi-database access

Table and schema endpoints are scoped by a `?db=<name>` query parameter, resolved by
`pg.Manager` (`backend/internal/pg/manager.go`), which caches one connection pool per
database. New per-database endpoints should use `Server.sourceFor(r)` rather than the
default `Server.store`, so they work on saved connections too.
