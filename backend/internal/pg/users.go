package pg

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

// ErrNoUser is returned when a console account does not exist.
var ErrNoUser = errors.New("user not found")

// ErrAlreadySetup is returned when first-run setup runs a second time.
var ErrAlreadySetup = errors.New("console is already set up")

// User is a console account. Credentials live in the console's own database,
// not in the environment, so they can be changed without a restart.
type User struct {
	ID           int64
	Username     string
	PasswordHash string
	CreatedAt    time.Time
	UpdatedAt    time.Time
	LastLoginAt  *time.Time
}

const userColumns = `id, username, password_hash, created_at, updated_at, last_login_at`

func scanUser(row pgx.Row) (*User, error) {
	var u User
	err := row.Scan(&u.ID, &u.Username, &u.PasswordHash, &u.CreatedAt, &u.UpdatedAt, &u.LastLoginAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNoUser
	}
	if err != nil {
		return nil, err
	}
	return &u, nil
}

// CountUsers reports how many console accounts exist. Zero means setup is due.
func (s *Store) CountUsers(ctx context.Context) (int, error) {
	var n int
	err := s.Pool.QueryRow(ctx, `SELECT count(*) FROM users`).Scan(&n)
	return n, err
}

// FindUser looks up one account by name, returning ErrNoUser when absent.
func (s *Store) FindUser(ctx context.Context, username string) (*User, error) {
	return scanUser(s.Pool.QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE username = $1`, username))
}

// FindUserByID looks up one account by primary key.
func (s *Store) FindUserByID(ctx context.Context, id int64) (*User, error) {
	return scanUser(s.Pool.QueryRow(ctx,
		`SELECT `+userColumns+` FROM users WHERE id = $1`, id))
}

// CreateFirstUser inserts the initial account, but only while none exists.
// The guard is in SQL so two concurrent setup requests cannot both win.
func (s *Store) CreateFirstUser(ctx context.Context, username, hash string) (*User, error) {
	const q = `
		INSERT INTO users (username, password_hash)
		SELECT $1, $2
		WHERE NOT EXISTS (SELECT 1 FROM users)
		RETURNING ` + userColumns

	u, err := scanUser(s.Pool.QueryRow(ctx, q, username, hash))
	if errors.Is(err, ErrNoUser) {
		return nil, ErrAlreadySetup
	}
	return u, err
}

// SetPassword replaces the stored hash for an existing account.
func (s *Store) SetPassword(ctx context.Context, username, hash string) error {
	const q = `
		UPDATE users
		SET password_hash = $2, updated_at = now()
		WHERE username = $1`

	tag, err := s.Pool.Exec(ctx, q, username, hash)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNoUser
	}
	return nil
}

// TouchLogin records a successful sign-in.
func (s *Store) TouchLogin(ctx context.Context, id int64) error {
	_, err := s.Pool.Exec(ctx, `UPDATE users SET last_login_at = now() WHERE id = $1`, id)
	return err
}
