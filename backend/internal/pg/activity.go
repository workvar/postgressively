package pg

import "context"

type Activity struct {
	PID      int     `json:"pid"`
	User     *string `json:"user"`
	Database *string `json:"database"`
	State    *string `json:"state"`
	Query    *string `json:"query"`
	Seconds  float64 `json:"secondsActive"`
}

func (s *Store) Activity(ctx context.Context) ([]Activity, error) {
	const q = `SELECT pid, usename, datname, state, query,
	                  COALESCE(EXTRACT(EPOCH FROM (now() - query_start)), 0)
	           FROM pg_stat_activity
	           WHERE pid <> pg_backend_pid()
	           ORDER BY 6 DESC NULLS LAST LIMIT 100`
	rows, err := s.Pool.Query(ctx, q)
	if err != nil {
		return nil, err
	}
	defer rows.Close()
	out := []Activity{}
	for rows.Next() {
		var a Activity
		if err := rows.Scan(&a.PID, &a.User, &a.Database, &a.State, &a.Query, &a.Seconds); err != nil {
			return nil, err
		}
		out = append(out, a)
	}
	return out, rows.Err()
}

// Terminate cancels a backend process.
func (s *Store) Terminate(ctx context.Context, pid int) error {
	_, err := s.Pool.Exec(ctx, `SELECT pg_terminate_backend($1)`, pid)
	return err
}
