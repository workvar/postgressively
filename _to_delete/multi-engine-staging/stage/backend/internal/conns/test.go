package conns

import (
	"context"
	"time"

	"github.com/postggresively/backend/internal/engine"
)

// TestResult is what the "Test connection" button reports back.
type TestResult struct {
	OK        bool   `json:"ok"`
	Engine    string `json:"engine"`
	Version   string `json:"version"`
	Database  string `json:"database"`
	Endpoint  string `json:"endpoint"`
	Tables    int    `json:"tables"`
	Databases int    `json:"databases"`
	Elapsed   int64  `json:"elapsedMs"`
	Error     string `json:"error,omitempty"`
}

// Test dials a connection string and reads enough to prove it works. Nothing
// is saved and no pool is kept: a failure comes back as a populated result
// with OK false, so the form can show it inline.
func Test(ctx context.Context, sp Spec, timeout time.Duration) TestResult {
	res := TestResult{Engine: sp.Engine}

	kind, dsn, err := sp.Validate()
	if err != nil {
		res.Error = err.Error()
		return res
	}
	res.Database = engine.DatabaseOf(kind, dsn)
	res.Endpoint = engine.Endpoint(kind, dsn)

	ctx, cancel := context.WithTimeout(ctx, timeout)
	defer cancel()

	start := time.Now()
	conn, err := engine.Open(ctx, kind, dsn)
	if err != nil {
		res.Error = err.Error()
		res.Elapsed = time.Since(start).Milliseconds()
		return res
	}
	defer conn.Close()

	if v, err := conn.Version(ctx); err == nil {
		res.Version = firstLine(v)
	}
	if dbs, err := conn.Databases(ctx); err == nil {
		res.Databases = len(dbs)
	}
	if tables, err := conn.Tables(ctx); err == nil {
		res.Tables = len(tables)
	}

	res.OK = true
	res.Elapsed = time.Since(start).Milliseconds()
	return res
}

// firstLine keeps the SQL Server banner, which is several lines, readable.
func firstLine(s string) string {
	for i, r := range s {
		if r == '\n' || r == '\r' {
			return s[:i]
		}
	}
	return s
}
