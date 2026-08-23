package passkey

import (
	"encoding/binary"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/postggresively/backend/internal/pg"
)

// Account adapts a console user plus its stored passkeys to webauthn.User.
//
// The user handle is the account's numeric id in eight big-endian bytes, so a
// discoverable ("usernameless") login can resolve straight back to the row.
type Account struct {
	User        *pg.User
	Credentials []pg.Credential
}

func (a *Account) WebAuthnID() []byte {
	return EncodeHandle(a.User.ID)
}

func (a *Account) WebAuthnName() string { return a.User.Username }

func (a *Account) WebAuthnDisplayName() string { return a.User.Username }

func (a *Account) WebAuthnCredentials() []webauthn.Credential {
	out := make([]webauthn.Credential, 0, len(a.Credentials))
	for _, c := range a.Credentials {
		out = append(out, toLibrary(c))
	}
	return out
}

// EncodeHandle turns an account id into the opaque WebAuthn user handle.
func EncodeHandle(id int64) []byte {
	buf := make([]byte, 8)
	binary.BigEndian.PutUint64(buf, uint64(id))
	return buf
}

// DecodeHandle reverses EncodeHandle, reporting whether the handle was valid.
func DecodeHandle(handle []byte) (int64, bool) {
	if len(handle) != 8 {
		return 0, false
	}
	return int64(binary.BigEndian.Uint64(handle)), true
}

func toLibrary(c pg.Credential) webauthn.Credential {
	transports := make([]protocol.AuthenticatorTransport, 0, len(c.Transports))
	for _, t := range c.Transports {
		transports = append(transports, protocol.AuthenticatorTransport(t))
	}
	return webauthn.Credential{
		ID:              c.CredentialID,
		PublicKey:       c.PublicKey,
		AttestationType: c.Attestation,
		Transport:       transports,
		Flags: webauthn.CredentialFlags{
			BackupEligible: c.BackupEligible,
			BackupState:    c.BackupState,
		},
		Authenticator: webauthn.Authenticator{
			AAGUID:    c.AAGUID,
			SignCount: c.SignCount,
		},
	}
}

// FromLibrary converts a freshly registered credential into its stored form.
func FromLibrary(userID int64, label string, c *webauthn.Credential) *pg.Credential {
	transports := make([]string, 0, len(c.Transport))
	for _, t := range c.Transport {
		transports = append(transports, string(t))
	}
	return &pg.Credential{
		UserID:         userID,
		Label:          label,
		CredentialID:   c.ID,
		PublicKey:      c.PublicKey,
		Attestation:    c.AttestationType,
		Transports:     transports,
		AAGUID:         c.Authenticator.AAGUID,
		SignCount:      c.Authenticator.SignCount,
		BackupEligible: c.Flags.BackupEligible,
		BackupState:    c.Flags.BackupState,
	}
}
