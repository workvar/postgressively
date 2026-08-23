package pg

import (
	"context"
	"errors"
	"time"

	"github.com/jackc/pgx/v5"
)

// ErrNoCredential is returned when a passkey is missing or owned by someone else.
var ErrNoCredential = errors.New("credential not found")

// Credential is one registered passkey.
type Credential struct {
	ID             int64      `json:"id"`
	UserID         int64      `json:"-"`
	Label          string     `json:"label"`
	CredentialID   []byte     `json:"-"`
	PublicKey      []byte     `json:"-"`
	Attestation    string     `json:"-"`
	Transports     []string   `json:"transports"`
	AAGUID         []byte     `json:"-"`
	SignCount      uint32     `json:"-"`
	BackupEligible bool       `json:"backupEligible"`
	BackupState    bool       `json:"backedUp"`
	CreatedAt      time.Time  `json:"createdAt"`
	LastUsedAt     *time.Time `json:"lastUsedAt"`
}

const credentialColumns = `id, user_id, label, credential_id, public_key, attestation,
	transports, aaguid, sign_count, backup_eligible, backup_state, created_at, last_used_at`

func scanCredential(row pgx.Row) (*Credential, error) {
	var c Credential
	var signCount int64
	err := row.Scan(&c.ID, &c.UserID, &c.Label, &c.CredentialID, &c.PublicKey, &c.Attestation,
		&c.Transports, &c.AAGUID, &signCount, &c.BackupEligible, &c.BackupState,
		&c.CreatedAt, &c.LastUsedAt)
	if errors.Is(err, pgx.ErrNoRows) {
		return nil, ErrNoCredential
	}
	if err != nil {
		return nil, err
	}
	c.SignCount = uint32(signCount)
	return &c, nil
}

// Credentials lists every passkey registered to one account.
func (s *Store) Credentials(ctx context.Context, userID int64) ([]Credential, error) {
	rows, err := s.Pool.Query(ctx,
		`SELECT `+credentialColumns+` FROM webauthn_credentials WHERE user_id = $1 ORDER BY created_at`,
		userID)
	if err != nil {
		return nil, err
	}
	defer rows.Close()

	out := []Credential{}
	for rows.Next() {
		c, err := scanCredential(rows)
		if err != nil {
			return nil, err
		}
		out = append(out, *c)
	}
	return out, rows.Err()
}

// CredentialByID finds a passkey by its raw WebAuthn credential id.
func (s *Store) CredentialByID(ctx context.Context, credentialID []byte) (*Credential, error) {
	return scanCredential(s.Pool.QueryRow(ctx,
		`SELECT `+credentialColumns+` FROM webauthn_credentials WHERE credential_id = $1`,
		credentialID))
}

// AddCredential stores a newly registered passkey.
func (s *Store) AddCredential(ctx context.Context, c *Credential) error {
	const q = `
		INSERT INTO webauthn_credentials
			(user_id, label, credential_id, public_key, attestation, transports,
			 aaguid, sign_count, backup_eligible, backup_state)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
		RETURNING id`

	return s.Pool.QueryRow(ctx, q,
		c.UserID, c.Label, c.CredentialID, c.PublicKey, c.Attestation, c.Transports,
		c.AAGUID, int64(c.SignCount), c.BackupEligible, c.BackupState,
	).Scan(&c.ID)
}

// UpdateCredentialUse bumps the signature counter after a successful assertion.
func (s *Store) UpdateCredentialUse(ctx context.Context, credentialID []byte, signCount uint32) error {
	_, err := s.Pool.Exec(ctx, `
		UPDATE webauthn_credentials
		SET sign_count = $2, last_used_at = now()
		WHERE credential_id = $1`, credentialID, int64(signCount))
	return err
}

// RenameCredential changes the human label on a passkey.
func (s *Store) RenameCredential(ctx context.Context, userID, id int64, label string) error {
	tag, err := s.Pool.Exec(ctx,
		`UPDATE webauthn_credentials SET label = $3 WHERE id = $2 AND user_id = $1`,
		userID, id, label)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNoCredential
	}
	return nil
}

// DeleteCredential removes one passkey belonging to the given account.
func (s *Store) DeleteCredential(ctx context.Context, userID, id int64) error {
	tag, err := s.Pool.Exec(ctx,
		`DELETE FROM webauthn_credentials WHERE id = $2 AND user_id = $1`, userID, id)
	if err != nil {
		return err
	}
	if tag.RowsAffected() == 0 {
		return ErrNoCredential
	}
	return nil
}
