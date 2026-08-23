package secrets

import "testing"

func TestSealOpenRoundTrip(t *testing.T) {
	box, err := NewBox("a-long-enough-secret")
	if err != nil {
		t.Fatalf("new box: %v", err)
	}
	const dsn = "postgres://user:s3cret@db.example.com:5432/shop?sslmode=require"

	sealed, err := box.Seal(dsn)
	if err != nil {
		t.Fatalf("seal: %v", err)
	}
	if string(sealed) == dsn {
		t.Fatal("the ciphertext is the plaintext")
	}

	got, err := box.Open(sealed)
	if err != nil {
		t.Fatalf("open: %v", err)
	}
	if got != dsn {
		t.Fatalf("got %q, want %q", got, dsn)
	}
}

func TestOpenRejectsAnotherKey(t *testing.T) {
	mine, _ := NewBox("first-secret")
	theirs, _ := NewBox("second-secret")

	sealed, err := mine.Seal("postgres://u:p@host/db")
	if err != nil {
		t.Fatalf("seal: %v", err)
	}
	if _, err := theirs.Open(sealed); err == nil {
		t.Fatal("expected a ciphertext from another key to be rejected")
	}
}

func TestNewBoxNeedsMaterial(t *testing.T) {
	if _, err := NewBox(""); err != ErrNoKey {
		t.Fatalf("got %v, want ErrNoKey", err)
	}
}
