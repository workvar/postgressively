package pg

import (
	"context"
	"fmt"
	"strings"

	"github.com/jackc/pgx/v5"
)

// CreateDatabaseSpec is the validated form of a create-database request.
type CreateDatabaseSpec struct {
	Name            string   `json:"name"`
	Owner           string   `json:"owner"`
	CreateOwner     bool     `json:"createOwner"`
	Encoding        string   `json:"encoding"`
	Locale          string   `json:"locale"`
	ConnectionLimit int      `json:"connectionLimit"`
	Extensions      []string `json:"extensions"`
}

// CreateDatabaseResult reports what actually happened.
type CreateDatabaseResult struct {
	Name              string   `json:"name"`
	Owner             string   `json:"owner"`
	OwnerCreated      bool     `json:"ownerCreated"`
	GeneratedPassword string   `json:"generatedPassword,omitempty"`
	Extensions        []string `json:"extensions"`
}

// Validate normalises the spec and rejects anything unsafe to interpolate.
func (spec *CreateDatabaseSpec) Validate() error {
	spec.Name = strings.TrimSpace(strings.ToLower(spec.Name))
	spec.Owner = strings.TrimSpace(strings.ToLower(spec.Owner))

	if err := ValidIdent(spec.Name); err != nil {
		return err
	}
	if spec.Owner == "" {
		spec.Owner = "postgres"
	}
	if err := ValidIdent(spec.Owner); err != nil {
		return err
	}
	if spec.Encoding == "" {
		spec.Encoding = "UTF8"
	}
	if !AllowedEncodings[spec.Encoding] {
		return fmt.Errorf("unsupported encoding %q", spec.Encoding)
	}
	if spec.Locale == "" {
		spec.Locale = "C"
	}
	if !AllowedLocales[spec.Locale] {
		return fmt.Errorf("unsupported locale %q", spec.Locale)
	}
	if spec.ConnectionLimit == 0 {
		spec.ConnectionLimit = -1
	}
	if spec.ConnectionLimit < -1 {
		return fmt.Errorf("connection limit must be -1 or a positive number")
	}
	for _, ext := range spec.Extensions {
		if !AllowedExtensions[ext] {
			return fmt.Errorf("extension %q is not allowed", ext)
		}
	}
	return nil
}

// CreateDatabase creates the role (optionally), the database, and its extensions.
func (s *Store) CreateDatabase(ctx context.Context, spec CreateDatabaseSpec) (*CreateDatabaseResult, error) {
	if err := spec.Validate(); err != nil {
		return nil, err
	}

	exists, err := s.databaseExists(ctx, spec.Name)
	if err != nil {
		return nil, err
	}
	if exists {
		return nil, fmt.Errorf("database %q already exists", spec.Name)
	}

	res := &CreateDatabaseResult{Name: spec.Name, Owner: spec.Owner, Extensions: []string{}}

	if spec.CreateOwner {
		created, password, err := s.ensureRole(ctx, spec.Owner)
		if err != nil {
			return nil, err
		}
		res.OwnerCreated = created
		res.GeneratedPassword = password
	}

	if _, err := s.Pool.Exec(ctx, createDatabaseSQL(spec)); err != nil {
		return nil, fmt.Errorf("create database: %w", err)
	}

	if len(spec.Extensions) > 0 {
		installed, err := s.installExtensions(ctx, spec.Name, spec.Extensions)
		if err != nil {
			return res, fmt.Errorf("database created, but extensions failed: %w", err)
		}
		res.Extensions = installed
	}

	return res, nil
}

func createDatabaseSQL(spec CreateDatabaseSpec) string {
	// LC_COLLATE / LC_CTYPE require TEMPLATE template0.
	return fmt.Sprintf(
		"CREATE DATABASE %s OWNER %s ENCODING %s LC_COLLATE %s LC_CTYPE %s TEMPLATE template0 CONNECTION LIMIT %d",
		quoteIdent(spec.Name),
		quoteIdent(spec.Owner),
		quoteLiteral(spec.Encoding),
		quoteLiteral(spec.Locale),
		quoteLiteral(spec.Locale),
		spec.ConnectionLimit,
	)
}

func (s *Store) databaseExists(ctx context.Context, name string) (bool, error) {
	var exists bool
	err := s.Pool.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM pg_database WHERE datname = $1)", name).Scan(&exists)
	return exists, err
}

// ensureRole creates the login role when missing. Returns whether it was created.
func (s *Store) ensureRole(ctx context.Context, role string) (bool, string, error) {
	var exists bool
	if err := s.Pool.QueryRow(ctx, "SELECT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = $1)", role).Scan(&exists); err != nil {
		return false, "", err
	}
	if exists {
		return false, "", nil
	}

	password, err := GeneratePassword()
	if err != nil {
		return false, "", err
	}
	stmt := fmt.Sprintf("CREATE ROLE %s LOGIN PASSWORD %s", quoteIdent(role), quoteLiteral(password))
	if _, err := s.Pool.Exec(ctx, stmt); err != nil {
		return false, "", fmt.Errorf("create role: %w", err)
	}
	return true, password, nil
}

// installExtensions opens a short-lived connection to the new database.
func (s *Store) installExtensions(ctx context.Context, database string, extensions []string) ([]string, error) {
	cfg := s.Pool.Config().ConnConfig.Copy()
	cfg.Database = database

	conn, err := pgx.ConnectConfig(ctx, cfg)
	if err != nil {
		return nil, err
	}
	defer conn.Close(ctx)

	installed := make([]string, 0, len(extensions))
	for _, ext := range extensions {
		if !AllowedExtensions[ext] {
			continue
		}
		stmt := fmt.Sprintf("CREATE EXTENSION IF NOT EXISTS %s", quoteIdent(ext))
		if _, err := conn.Exec(ctx, stmt); err != nil {
			return installed, fmt.Errorf("extension %s: %w", ext, err)
		}
		installed = append(installed, ext)
	}
	return installed, nil
}

// DropDatabase removes a database after forcing existing sessions to disconnect.
func (s *Store) DropDatabase(ctx context.Context, name string) error {
	if err := ValidIdent(name); err != nil {
		return err
	}
	protected := map[string]bool{"postgres": true, "template0": true, "template1": true}
	if protected[name] {
		return fmt.Errorf("refusing to drop system database %q", name)
	}
	if name == s.Pool.Config().ConnConfig.Database {
		return fmt.Errorf("refusing to drop %q: it is the console's own connection", name)
	}

	if _, err := s.Pool.Exec(ctx,
		"SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE datname = $1 AND pid <> pg_backend_pid()",
		name,
	); err != nil {
		return fmt.Errorf("disconnect sessions: %w", err)
	}

	if _, err := s.Pool.Exec(ctx, "DROP DATABASE "+quoteIdent(name)); err != nil {
		return fmt.Errorf("drop database: %w", err)
	}
	return nil
}
