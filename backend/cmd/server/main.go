package main

import (
	"context"
	"errors"
	"fmt"
	"log"
	"net/http"
	"os"
	"os/signal"
	"runtime"
	"syscall"
	"time"

	"github.com/postggresively/backend/internal/agentclient"
	"github.com/postggresively/backend/internal/api"
	"github.com/postggresively/backend/internal/auth"
	"github.com/postggresively/backend/internal/bugs"
	"github.com/postggresively/backend/internal/config"
	"github.com/postggresively/backend/internal/conns"
	"github.com/postggresively/backend/internal/passkey"
	"github.com/postggresively/backend/internal/pg"
	"github.com/postggresively/backend/internal/secrets"
	"github.com/postggresively/backend/internal/telemetry"
	"github.com/postggresively/backend/internal/updates"
	"github.com/postggresively/backend/internal/version"
)

func main() {
	// Helper: `server hashpw <password>` prints a bcrypt hash for the env file.
	if len(os.Args) == 3 && os.Args[1] == "hashpw" {
		h, err := auth.HashPassword(os.Args[2])
		if err != nil {
			log.Fatal(err)
		}
		fmt.Println(h)
		return
	}

	cfg, err := config.Load()
	if err != nil {
		log.Fatalf("config: %v", err)
	}

	ctx, cancel := signal.NotifyContext(context.Background(), syscall.SIGINT, syscall.SIGTERM)
	defer cancel()

	// Opens the operator's database and the console's own database, creating
	// the latter (PG_META_DATABASE, default "postggresively") on first boot.
	dbs, err := pg.NewManager(ctx, cfg.DatabaseURL, cfg.MetaDatabase)
	if err != nil {
		log.Fatalf("database: %v", err)
	}
	defer dbs.Close()

	// Installs that predate the console database kept accounts in a schema
	// inside the operator's own database. Bring them across once.
	if copied, err := pg.MigrateLegacyUsers(ctx, dbs.Default(), dbs.Meta()); err != nil {
		log.Printf("legacy account migration: %v", err)
	} else if copied > 0 {
		log.Printf("migrated %d account(s) into database %q", copied, cfg.MetaDatabase)
	}

	// Saved connections to other databases need a key to encrypt their
	// connection strings with. Without one the console still runs; the
	// /api/connections routes report themselves unavailable.
	var connStore *conns.Store
	var registry *conns.Registry
	if box, err := secrets.NewBox(cfg.SecretKey); err != nil {
		log.Printf("saved connections disabled: %v", err)
	} else {
		connStore = conns.NewStore(dbs.Meta(), box)
		registry = conns.NewRegistry(connStore)
		defer registry.Close()
	}

	// Passkeys are optional: a bad relying-party config degrades to
	// password-only rather than stopping the console from booting.
	passkeys, err := passkey.New(dbs.Meta(), cfg.RPID, cfg.RPDisplayName, cfg.RPOrigins)
	if err != nil {
		log.Printf("passkeys disabled: %v", err)
		passkeys = nil
	}

	// Anonymous product analytics. telemetry.MeasurementID/APISecret are
	// baked in at build time (see internal/telemetry/baked.go), not read
	// from the environment -- entirely local (and inert) unless this binary
	// was built by the official release pipeline. Never on the critical
	// path: New never fails, Track never blocks.
	tel := telemetry.New(cfg.DataDir, telemetry.MeasurementID, telemetry.APISecret, version.Version)
	defer tel.Close()
	tel.TrackInstallation(runtime.GOOS, runtime.GOARCH)

	// Bug reports → GitHub Issues. bugs.Token is baked at build time (see
	// internal/bugs/baked.go); empty for self-built binaries.
	bugClient := bugs.New(bugs.Token, bugs.DefaultRepo, nil)
	updateChecker := updates.NewChecker(nil, time.Hour)

	srv := &http.Server{
		Addr: cfg.Addr,
		Handler: api.NewServer(cfg, api.Deps{
			Databases:   dbs,
			Connections: connStore,
			Registry:    registry,
			Agent:       agentclient.New(cfg.AgentURL, cfg.AgentToken),
			Passkeys:    passkeys,
			Telemetry:   tel,
			Bugs:        bugClient,
			Updates:     updateChecker,
		}).Handler(),
		ReadHeaderTimeout: 10 * time.Second,
	}

	go func() {
		log.Printf("backend listening on %s (read-only=%v)", cfg.Addr, cfg.ReadOnly)
		if err := srv.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("listen: %v", err)
		}
	}()

	<-ctx.Done()
	shutdownCtx, stop := context.WithTimeout(context.Background(), 10*time.Second)
	defer stop()
	_ = srv.Shutdown(shutdownCtx)
	log.Println("backend stopped")
}
