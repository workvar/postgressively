// Package engine connects the console to relational databases other than the
// Postgres instance it was installed next to: a remote Postgres, MySQL or
// MariaDB, SQLite, or SQL Server, each reached through a connection string.
package engine

import "fmt"

// Kind identifies a supported relational engine.
type Kind string

const (
	Postgres  Kind = "postgres"
	MySQL     Kind = "mysql"
	SQLite    Kind = "sqlite"
	SQLServer Kind = "sqlserver"
)

// Descriptor is what the UI needs to render an engine as a choice: its label,
// an example connection string, and which console features it supports.
type Descriptor struct {
	Kind    Kind   `json:"kind"`
	Label   string `json:"label"`
	Example string `json:"example"`
	// Remote is false for engines that can only open a local file.
	Remote bool `json:"remote"`
	// Editable is true where the row grid can write changes back.
	Editable bool `json:"editable"`
	// Schemas is true where tables live under a schema, not directly under
	// the database. The UI hides the schema column when this is false.
	Schemas bool `json:"schemas"`
	// Manageable is true for the engine the host agent can operate:
	// service control, backups, activity, database creation.
	Manageable bool `json:"manageable"`
}

var descriptors = []Descriptor{
	{
		Kind:       Postgres,
		Label:      "PostgreSQL",
		Example:    "postgres://user:password@host:5432/dbname?sslmode=require",
		Remote:     true,
		Editable:   true,
		Schemas:    true,
		Manageable: true,
	},
	{
		Kind:     MySQL,
		Label:    "MySQL / MariaDB",
		Example:  "mysql://user:password@host:3306/dbname?tls=true",
		Remote:   true,
		Editable: false,
		Schemas:  true,
	},
	{
		Kind:     SQLite,
		Label:    "SQLite",
		Example:  "/var/lib/app/data.db",
		Remote:   false,
		Editable: false,
		Schemas:  false,
	},
	{
		Kind:     SQLServer,
		Label:    "SQL Server",
		Example:  "sqlserver://user:password@host:1433?database=dbname&encrypt=true",
		Remote:   true,
		Editable: false,
		Schemas:  true,
	},
}

// Descriptors lists every engine the console can connect to.
func Descriptors() []Descriptor { return append([]Descriptor(nil), descriptors...) }

// Describe returns the descriptor for one kind.
func Describe(k Kind) (Descriptor, bool) {
	for _, d := range descriptors {
		if d.Kind == k {
			return d, true
		}
	}
	return Descriptor{}, false
}

// ParseKind validates an engine name coming off the wire.
func ParseKind(s string) (Kind, error) {
	if _, ok := Describe(Kind(s)); ok {
		return Kind(s), nil
	}
	return "", fmt.Errorf("unsupported engine %q", s)
}
