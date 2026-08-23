package pgctl

import (
	"context"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"time"

	"github.com/postggresively/agent/internal/config"
)

var safeName = regexp.MustCompile(`^[A-Za-z0-9_-]{1,63}$`)

type Backup struct {
	File      string `json:"file"`
	Database  string `json:"database"`
	SizeBytes int64  `json:"sizeBytes"`
	CreatedAt string `json:"createdAt"`
}

type Backups struct {
	cfg *config.Config
}

func NewBackups(cfg *config.Config) *Backups { return &Backups{cfg: cfg} }

// Create runs pg_dump into the configured backup directory.
func (b *Backups) Create(ctx context.Context, database string) (map[string]any, error) {
	if !safeName.MatchString(database) {
		return nil, errors.New("invalid database name")
	}
	if err := os.MkdirAll(b.cfg.BackupDir, 0o750); err != nil {
		return nil, err
	}
	name := fmt.Sprintf("%s-%s.dump", database, time.Now().UTC().Format("20060102T150405Z"))
	path := filepath.Join(b.cfg.BackupDir, name)

	out, err := run(ctx, 30*time.Minute,
		filepath.Join(b.cfg.PGBinDir, "pg_dump"),
		"-h", b.cfg.PGHost,
		"-p", fmt.Sprint(b.cfg.PGPort),
		"-U", b.cfg.PGUser,
		"-Fc", "-f", path, database,
	)
	if err != nil {
		_ = os.Remove(path)
		return nil, errors.New("pg_dump failed: " + out)
	}
	info, err := os.Stat(path)
	if err != nil {
		return nil, err
	}
	return map[string]any{"backup": Backup{
		File:      name,
		Database:  database,
		SizeBytes: info.Size(),
		CreatedAt: info.ModTime().UTC().Format(time.RFC3339),
	}}, nil
}

// List returns existing dumps, newest first.
func (b *Backups) List() (map[string]any, error) {
	entries, err := os.ReadDir(b.cfg.BackupDir)
	if err != nil {
		if os.IsNotExist(err) {
			return map[string]any{"backups": []Backup{}}, nil
		}
		return nil, err
	}
	list := []Backup{}
	for _, e := range entries {
		if e.IsDir() || filepath.Ext(e.Name()) != ".dump" {
			continue
		}
		info, err := e.Info()
		if err != nil {
			continue
		}
		list = append(list, Backup{
			File:      e.Name(),
			SizeBytes: info.Size(),
			CreatedAt: info.ModTime().UTC().Format(time.RFC3339),
		})
	}
	sort.Slice(list, func(i, j int) bool { return list[i].CreatedAt > list[j].CreatedAt })
	return map[string]any{"backups": list, "dir": b.cfg.BackupDir}, nil
}
