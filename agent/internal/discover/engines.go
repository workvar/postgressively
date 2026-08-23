package discover

// engine describes how to recognise a database product on the local host.
type engine struct {
	// ID is the stable machine name, e.g. "postgres".
	ID string
	// Label is the human-readable product name.
	Label string
	// Ports are the conventional listening ports, most common first.
	Ports []int
	// Binaries are candidate executables, most authoritative first.
	Binaries []string
	// Processes are process names that identify this engine in a port listing.
	Processes []string
}

// engines is the catalog scanned on every discovery run. Keeping it declarative
// means supporting a new product is a single entry.
var engines = []engine{
	{
		ID:        "postgres",
		Label:     "PostgreSQL",
		Ports:     []int{5432, 5433, 5434, 5435},
		Binaries:  []string{"postgres", "psql"},
		Processes: []string{"postgres", "postmaster"},
	},
	{
		ID:        "mysql",
		Label:     "MySQL / MariaDB",
		Ports:     []int{3306, 3307},
		Binaries:  []string{"mysqld", "mariadbd", "mysql", "mariadb"},
		Processes: []string{"mysqld", "mariadbd", "mysql"},
	},
	{
		ID:        "mongodb",
		Label:     "MongoDB",
		Ports:     []int{27017, 27018, 27019},
		Binaries:  []string{"mongod", "mongosh"},
		Processes: []string{"mongod"},
	},
	{
		ID:        "redis",
		Label:     "Redis / Valkey",
		Ports:     []int{6379, 6380},
		Binaries:  []string{"redis-server", "valkey-server", "redis-cli"},
		Processes: []string{"redis-ser", "redis-server", "valkey-se"},
	},
	{
		ID:        "mssql",
		Label:     "SQL Server",
		Ports:     []int{1433},
		Binaries:  []string{"sqlservr", "sqlcmd"},
		Processes: []string{"sqlservr"},
	},
}

// engineForProcess maps a process name from a port listing back to an engine ID.
func engineForProcess(process string) (string, bool) {
	for _, e := range engines {
		for _, p := range e.Processes {
			if process == p {
				return e.ID, true
			}
		}
	}
	return "", false
}

func labelFor(id string) string {
	for _, e := range engines {
		if e.ID == id {
			return e.Label
		}
	}
	return id
}
