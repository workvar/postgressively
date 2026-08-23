// Package secrets seals the connection strings the console stores.
//
// A saved connection is only useful if the console can reconnect with it, so
// the password cannot be hashed. It is encrypted instead, with a key derived
// from the operator's own secret, and the ciphertext is what lands in the
// console's database.
package secrets

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"errors"
	"io"

	"golang.org/x/crypto/hkdf"
)

// Box seals and opens short secrets with AES-256-GCM.
type Box struct {
	aead cipher.AEAD
}

// ErrNoKey is returned when there is no key material to derive from.
var ErrNoKey = errors.New("no secret key configured")

// NewBox derives a key from the given material. The material is whatever the
// operator set in PG_SECRET_KEY, falling back to PG_JWT_SECRET, so an existing
// install keeps working without a new environment variable.
func NewBox(material string) (*Box, error) {
	if material == "" {
		return nil, ErrNoKey
	}
	key := make([]byte, 32)
	kdf := hkdf.New(sha256.New, []byte(material), nil, []byte("postggresively/connections"))
	if _, err := io.ReadFull(kdf, key); err != nil {
		return nil, err
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		return nil, err
	}
	aead, err := cipher.NewGCM(block)
	if err != nil {
		return nil, err
	}
	return &Box{aead: aead}, nil
}

// Seal encrypts plaintext, returning nonce||ciphertext.
func (b *Box) Seal(plaintext string) ([]byte, error) {
	nonce := make([]byte, b.aead.NonceSize())
	if _, err := rand.Read(nonce); err != nil {
		return nil, err
	}
	return b.aead.Seal(nonce, nonce, []byte(plaintext), nil), nil
}

// Open reverses Seal. A ciphertext that was written with a different key
// fails here rather than returning something wrong.
func (b *Box) Open(sealed []byte) (string, error) {
	n := b.aead.NonceSize()
	if len(sealed) < n {
		return "", errors.New("stored secret is truncated")
	}
	plain, err := b.aead.Open(nil, sealed[:n], sealed[n:], nil)
	if err != nil {
		return "", errors.New("stored secret cannot be decrypted with the current key")
	}
	return string(plain), nil
}
