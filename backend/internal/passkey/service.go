package passkey

import (
	"context"
	"errors"

	"github.com/go-webauthn/webauthn/protocol"
	"github.com/go-webauthn/webauthn/webauthn"
	"github.com/postggresively/backend/internal/pg"
)

// ErrNoAccount is returned when a passkey resolves to a user that is gone.
var ErrNoAccount = errors.New("account not found")

// Service runs the WebAuthn ceremonies against the console's user store.
type Service struct {
	web      *webauthn.WebAuthn
	store    *pg.Store
	sessions *SessionStore
}

// New builds the service. rpID is the registrable domain the UI is served
// from, and origins are the exact browser origins allowed to authenticate.
func New(store *pg.Store, rpID, displayName string, origins []string) (*Service, error) {
	w, err := webauthn.New(&webauthn.Config{
		RPID:          rpID,
		RPDisplayName: displayName,
		RPOrigins:     origins,
		AuthenticatorSelection: protocol.AuthenticatorSelection{
			ResidentKey:      protocol.ResidentKeyRequirementPreferred,
			UserVerification: protocol.VerificationPreferred,
		},
	})
	if err != nil {
		return nil, err
	}
	return &Service{web: w, store: store, sessions: NewSessionStore()}, nil
}

// account loads a user together with its passkeys.
func (s *Service) account(ctx context.Context, u *pg.User) (*Account, error) {
	creds, err := s.store.Credentials(ctx, u.ID)
	if err != nil {
		return nil, err
	}
	return &Account{User: u, Credentials: creds}, nil
}

// BeginRegistration starts adding a passkey to an existing account.
func (s *Service) BeginRegistration(ctx context.Context, u *pg.User) (*protocol.CredentialCreation, string, error) {
	acct, err := s.account(ctx, u)
	if err != nil {
		return nil, "", err
	}
	exclude := make([]protocol.CredentialDescriptor, 0, len(acct.Credentials))
	for _, c := range acct.WebAuthnCredentials() {
		exclude = append(exclude, c.Descriptor())
	}

	options, session, err := s.web.BeginRegistration(acct,
		webauthn.WithExclusions(exclude),
		webauthn.WithResidentKeyRequirement(protocol.ResidentKeyRequirementPreferred),
	)
	if err != nil {
		return nil, "", err
	}
	return options, s.sessions.Put(session), nil
}

// FinishRegistration verifies the attestation and stores the new passkey.
// raw is the JSON credential the browser produced.
func (s *Service) FinishRegistration(ctx context.Context, u *pg.User, sessionID, label string, raw []byte) (*pg.Credential, error) {
	session, ok := s.sessions.Take(sessionID)
	if !ok {
		return nil, errors.New("registration session expired, start again")
	}
	acct, err := s.account(ctx, u)
	if err != nil {
		return nil, err
	}

	parsed, err := protocol.ParseCredentialCreationResponseBytes(raw)
	if err != nil {
		return nil, err
	}
	cred, err := s.web.CreateCredential(acct, *session, parsed)
	if err != nil {
		return nil, err
	}
	if label == "" {
		label = "Passkey"
	}

	stored := FromLibrary(u.ID, label, cred)
	if err := s.store.AddCredential(ctx, stored); err != nil {
		return nil, err
	}
	return stored, nil
}

// BeginAssertion starts a discoverable login or a step-up confirmation.
func (s *Service) BeginAssertion(_ context.Context) (*protocol.CredentialAssertion, string, error) {
	options, session, err := s.web.BeginDiscoverableLogin(
		webauthn.WithUserVerification(protocol.VerificationPreferred),
	)
	if err != nil {
		return nil, "", err
	}
	return options, s.sessions.Put(session), nil
}

// FinishAssertion verifies an assertion and returns the account behind it.
// raw is the JSON credential the browser produced.
func (s *Service) FinishAssertion(ctx context.Context, sessionID string, raw []byte) (*pg.User, error) {
	session, ok := s.sessions.Take(sessionID)
	if !ok {
		return nil, errors.New("sign-in session expired, start again")
	}

	var resolved *pg.User
	handler := func(rawID, userHandle []byte) (webauthn.User, error) {
		id, ok := DecodeHandle(userHandle)
		if !ok {
			return nil, ErrNoAccount
		}
		u, err := s.store.FindUserByID(ctx, id)
		if err != nil {
			return nil, err
		}
		resolved = u
		return s.account(ctx, u)
	}

	parsed, err := protocol.ParseCredentialRequestResponseBytes(raw)
	if err != nil {
		return nil, err
	}
	cred, err := s.web.ValidateDiscoverableLogin(handler, *session, parsed)
	if err != nil {
		return nil, err
	}
	if resolved == nil {
		return nil, ErrNoAccount
	}
	if err := s.store.UpdateCredentialUse(ctx, cred.ID, cred.Authenticator.SignCount); err != nil {
		return nil, err
	}
	return resolved, nil
}
