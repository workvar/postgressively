package pg

// metaSchemaDDL is the full schema of the console's own database.
//
// Everything the console needs to remember about itself lives here: accounts,
// passkeys, saved SQL snippets, preferences and the audit trail. It is a
// separate database (PG_META_DATABASE, default "postggresively") so nothing is
// ever written into a database the operator actually uses.
const metaSchemaDDL = `
CREATE TABLE IF NOT EXISTS users (
	id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	username      text        NOT NULL UNIQUE,
	password_hash text        NOT NULL,
	display_name  text,
	created_at    timestamptz NOT NULL DEFAULT now(),
	updated_at    timestamptz NOT NULL DEFAULT now(),
	last_login_at timestamptz
);

CREATE TABLE IF NOT EXISTS webauthn_credentials (
	id             bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	user_id        bigint      NOT NULL REFERENCES users(id) ON DELETE CASCADE,
	label          text        NOT NULL DEFAULT 'Passkey',
	credential_id  bytea       NOT NULL UNIQUE,
	public_key     bytea       NOT NULL,
	attestation    text        NOT NULL DEFAULT '',
	transports     text[]      NOT NULL DEFAULT '{}',
	aaguid         bytea       NOT NULL DEFAULT '',
	sign_count     bigint      NOT NULL DEFAULT 0,
	backup_eligible boolean    NOT NULL DEFAULT false,
	backup_state   boolean     NOT NULL DEFAULT false,
	created_at     timestamptz NOT NULL DEFAULT now(),
	last_used_at   timestamptz
);

CREATE INDEX IF NOT EXISTS webauthn_credentials_user_idx
	ON webauthn_credentials (user_id);

CREATE TABLE IF NOT EXISTS saved_queries (
	id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	user_id    bigint      REFERENCES users(id) ON DELETE SET NULL,
	name       text        NOT NULL,
	database   text        NOT NULL DEFAULT '',
	sql        text        NOT NULL,
	created_at timestamptz NOT NULL DEFAULT now(),
	updated_at timestamptz NOT NULL DEFAULT now()
);

-- Saved connections to other relational databases: a remote Postgres, MySQL
-- or MariaDB, SQLite, or SQL Server. The connection string has to be
-- replayable, so it is encrypted (internal/secrets) rather than hashed, and
-- only the redacted form is ever read back for display.
CREATE TABLE IF NOT EXISTS connections (
	id            bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	name          text        NOT NULL UNIQUE,
	engine        text        NOT NULL,
	dsn_encrypted bytea       NOT NULL,
	database      text        NOT NULL DEFAULT '',
	endpoint      text        NOT NULL DEFAULT '',
	redacted      text        NOT NULL DEFAULT '',
	created_by    text        NOT NULL DEFAULT '',
	created_at    timestamptz NOT NULL DEFAULT now(),
	updated_at    timestamptz NOT NULL DEFAULT now(),
	last_used_at  timestamptz
);

CREATE TABLE IF NOT EXISTS settings (
	key        text        PRIMARY KEY,
	value      jsonb       NOT NULL,
	updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS audit_log (
	id         bigint      GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
	actor      text        NOT NULL,
	action     text        NOT NULL,
	target     text        NOT NULL DEFAULT '',
	detail     jsonb       NOT NULL DEFAULT '{}'::jsonb,
	created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS audit_log_created_idx
	ON audit_log (created_at DESC);
`
