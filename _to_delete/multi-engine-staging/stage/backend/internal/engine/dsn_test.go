package engine

import (
	"strings"
	"testing"
)

func TestNormalizeMySQLURL(t *testing.T) {
	got, err := Normalize(MySQL, "mysql://root:s3cret@db.example.com/shop?tls=true")
	if err != nil {
		t.Fatalf("normalize: %v", err)
	}
	want := "root:s3cret@tcp(db.example.com:3306)/shop?tls=true&parseTime=true"
	if got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}

func TestNormalizeRejectsWrongScheme(t *testing.T) {
	if _, err := Normalize(Postgres, "mysql://root@localhost/shop"); err == nil {
		t.Fatal("expected a scheme mismatch to be rejected")
	}
}

func TestDatabaseOf(t *testing.T) {
	cases := []struct {
		kind Kind
		dsn  string
		want string
	}{
		{Postgres, "postgres://u:p@host:5432/shop?sslmode=require", "shop"},
		{MySQL, "u:p@tcp(host:3306)/shop?parseTime=true", "shop"},
		{SQLServer, "sqlserver://u:p@host:1433?database=shop", "shop"},
		{SQLite, "/var/lib/app/data.db", "data.db"},
	}
	for _, c := range cases {
		if got := DatabaseOf(c.kind, c.dsn); got != c.want {
			t.Errorf("%s: got %q, want %q", c.kind, got, c.want)
		}
	}
}

func TestWithDatabase(t *testing.T) {
	got, err := WithDatabase(MySQL, "u:p@tcp(host:3306)/shop?parseTime=true", "reporting")
	if err != nil {
		t.Fatalf("with database: %v", err)
	}
	if want := "u:p@tcp(host:3306)/reporting?parseTime=true"; got != want {
		t.Fatalf("got %q, want %q", got, want)
	}
}

func TestRedactHidesPassword(t *testing.T) {
	cases := []struct {
		kind Kind
		dsn  string
	}{
		{Postgres, "postgres://u:s3cret@host:5432/shop"},
		{MySQL, "u:s3cret@tcp(host:3306)/shop"},
		{SQLServer, "sqlserver://u:s3cret@host:1433?database=shop"},
	}
	for _, c := range cases {
		got := Redact(c.kind, c.dsn)
		if strings.Contains(got, "s3cret") {
			t.Errorf("%s: password survived redaction: %q", c.kind, got)
		}
	}
}
