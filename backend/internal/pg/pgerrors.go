package pg

import (
	"errors"

	"github.com/jackc/pgx/v5/pgconn"
)

// duplicateDatabase is Postgres SQLSTATE 42P04.
const duplicateDatabase = "42P04"

// isDuplicateDatabase reports whether err is "database already exists", which
// two servers booting at once can both hit while creating the meta database.
func isDuplicateDatabase(err error) bool {
	var pgErr *pgconn.PgError
	return errors.As(err, &pgErr) && pgErr.Code == duplicateDatabase
}
