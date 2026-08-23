package pg

import "context"

// MigrateLegacyUsers copies accounts from the old location (a `postggresively`
// schema inside the operator's own database) into the console database, then
// leaves the old table in place so an operator can verify before dropping it.
//
// It is a no-op once the accounts have been copied, and on installs that never
// used the old layout. Returns the number of accounts copied.
func MigrateLegacyUsers(ctx context.Context, legacy, meta *Store) (int, error) {
	var present bool
	err := legacy.Pool.QueryRow(ctx, `
		SELECT EXISTS (
			SELECT 1 FROM information_schema.tables
			WHERE table_schema = 'postggresively' AND table_name = 'users'
		)`).Scan(&present)
	if err != nil || !present {
		return 0, err
	}

	rows, err := legacy.Pool.Query(ctx, `
		SELECT username, password_hash, created_at, updated_at
		FROM postggresively.users`)
	if err != nil {
		return 0, err
	}
	defer rows.Close()

	type legacyUser struct {
		username, hash       string
		createdAt, updatedAt any
	}
	var found []legacyUser
	for rows.Next() {
		var u legacyUser
		if err := rows.Scan(&u.username, &u.hash, &u.createdAt, &u.updatedAt); err != nil {
			return 0, err
		}
		found = append(found, u)
	}
	if err := rows.Err(); err != nil {
		return 0, err
	}

	copied := 0
	for _, u := range found {
		tag, err := meta.Pool.Exec(ctx, `
			INSERT INTO users (username, password_hash, created_at, updated_at)
			VALUES ($1, $2, $3, $4)
			ON CONFLICT (username) DO NOTHING`,
			u.username, u.hash, u.createdAt, u.updatedAt)
		if err != nil {
			return copied, err
		}
		copied += int(tag.RowsAffected())
	}
	return copied, nil
}
