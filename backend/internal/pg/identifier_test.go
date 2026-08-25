package pg

import (
	"strings"
	"testing"
)

func TestValidIdent(t *testing.T) {
	ok := []string{
		"postgres",
		"my_app",
		"_private",
		"a",
		"second-opinion",
		"uuid-ossp",
		"app-v2",
		"rosERP",
		"MyApp",
		"has space",
		"has.dot",
		"with\"quote",
	}
	for _, name := range ok {
		if err := ValidIdent(name); err != nil {
			t.Errorf("ValidIdent(%q) = %v, want nil", name, err)
		}
	}

	bad := []string{
		"",
		"has\x00null",
		strings.Repeat("a", 64),
	}
	for _, name := range bad {
		if err := ValidIdent(name); err == nil {
			t.Errorf("ValidIdent(%q) = nil, want error", name)
		}
	}
}

func TestQuoteIdentEscapes(t *testing.T) {
	got := quoteIdent(`a"b`)
	want := `"a""b"`
	if got != want {
		t.Fatalf("quoteIdent = %q, want %q", got, want)
	}
}
