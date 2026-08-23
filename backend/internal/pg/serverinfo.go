package pg

import "context"

// ServerInfo describes the Postgres instance we are connected to. It is read
// over the existing connection, so it stays accurate even when the agent
// cannot exec local binaries or reach an init system.
type ServerInfo struct {
	Version      string `json:"version"`
	VersionNum   int    `json:"versionNum"`
	Host         string `json:"host"`
	Port         int    `json:"port"`
	DataDir      string `json:"dataDir"`
	StartedAt    string `json:"startedAt"`
	UptimeSecond int64  `json:"uptimeSeconds"`
}

// ServerInfo queries the live connection for identity and uptime details.
func (s *Store) ServerInfo(ctx context.Context) (*ServerInfo, error) {
	const q = `SELECT current_setting('server_version'),
	                  current_setting('server_version_num')::int,
	                  COALESCE(inet_server_addr()::text, 'localhost'),
	                  COALESCE(inet_server_port(), current_setting('port')::int),
	                  COALESCE(current_setting('data_directory', true), ''),
	                  to_char(pg_postmaster_start_time(), 'YYYY-MM-DD"T"HH24:MI:SSOF'),
	                  EXTRACT(EPOCH FROM now() - pg_postmaster_start_time())::bigint`

	var info ServerInfo
	err := s.Pool.QueryRow(ctx, q).Scan(
		&info.Version, &info.VersionNum, &info.Host, &info.Port,
		&info.DataDir, &info.StartedAt, &info.UptimeSecond,
	)
	if err != nil {
		return nil, err
	}
	return &info, nil
}
