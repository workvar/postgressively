package api

import (
	"net/http"

	"github.com/postggresively/backend/internal/agentclient"
	"github.com/postggresively/backend/internal/bugs"
	"github.com/postggresively/backend/internal/config"
	"github.com/postggresively/backend/internal/conns"
	"github.com/postggresively/backend/internal/passkey"
	"github.com/postggresively/backend/internal/pg"
	"github.com/postggresively/backend/internal/telemetry"
	"github.com/postggresively/backend/internal/updates"
)

// Server wires config, database access and the agent client into HTTP handlers.
//
//   - store is the operator's default database.
//   - meta is the console's own database: accounts, passkeys, settings, audit.
//   - dbs resolves any other database on the same server via ?db=<name>.
//   - conns and registry cover the databases the operator saved themselves:
//     a remote Postgres, MySQL, SQLite or SQL Server, picked with ?conn=<id>.
//     Both are nil when no encryption key could be derived, and the
//     /api/connections routes then report themselves unavailable.
type Server struct {
	cfg       *config.Config
	store     *pg.Store
	meta      *pg.Store
	dbs       *pg.Manager
	conns     *conns.Store
	registry  *conns.Registry
	agent     *agentclient.Client
	passkeys  *passkey.Service
	telemetry *telemetry.Client
	bugs      *bugs.Client
	updates   *updates.Checker
}

// Deps groups the collaborators NewServer needs beyond configuration.
type Deps struct {
	Databases   *pg.Manager
	Connections *conns.Store
	Registry    *conns.Registry
	Agent       *agentclient.Client
	Passkeys    *passkey.Service
	Telemetry   *telemetry.Client
	Bugs        *bugs.Client
	Updates     *updates.Checker
}

func NewServer(cfg *config.Config, d Deps) *Server {
	return &Server{
		cfg:       cfg,
		store:     d.Databases.Default(),
		meta:      d.Databases.Meta(),
		dbs:       d.Databases,
		conns:     d.Connections,
		registry:  d.Registry,
		agent:     d.Agent,
		passkeys:  d.Passkeys,
		telemetry: d.Telemetry,
		bugs:      d.Bugs,
		updates:   d.Updates,
	}
}

func (s *Server) Handler() http.Handler {
	mux := http.NewServeMux()
	s.routePublic(mux)
	s.routeAccount(mux)
	s.routeConnections(mux)
	s.routeData(mux)
	s.routeAgent(mux)
	return s.withCORS(withLogging(mux))
}

// routePublic covers everything reachable before a session exists.
func (s *Server) routePublic(mux *http.ServeMux) {
	mux.HandleFunc("GET /healthz", func(w http.ResponseWriter, r *http.Request) {
		writeJSON(w, http.StatusOK, map[string]string{"status": "ok"})
	})
	mux.HandleFunc("GET /api/setup/status", s.handleSetupStatus)
	mux.HandleFunc("POST /api/setup", s.handleSetup)
	mux.HandleFunc("POST /api/login", s.handleLogin)
	mux.HandleFunc("POST /api/login/passkey/begin", s.handlePasskeyLoginBegin)
	mux.HandleFunc("POST /api/login/passkey/finish", s.handlePasskeyLoginFinish)

	// Public (not just pre-auth) because Clarity, gated by uiAnalytics,
	// needs this on /login and /setup too, before any session exists.
	mux.HandleFunc("GET /api/telemetry", s.handleTelemetryGet)
}

// routeAccount covers the signed-in user's own identity and credentials.
func (s *Server) routeAccount(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/me", s.requireAuth(s.handleMe))
	mux.HandleFunc("POST /api/account/password", s.requireAuth(s.handlePasswordChange))

	mux.HandleFunc("GET /api/passkeys", s.requireAuth(s.handlePasskeyList))
	mux.HandleFunc("POST /api/passkeys/register/begin", s.requireAuth(s.handlePasskeyRegisterBegin))
	mux.HandleFunc("POST /api/passkeys/register/finish", s.requireAuth(s.handlePasskeyRegisterFinish))
	mux.HandleFunc("PATCH /api/passkeys/{id}", s.requireAuth(s.handlePasskeyRename))
	mux.HandleFunc("DELETE /api/passkeys/{id}", s.requireElevated(s.handlePasskeyDelete))

	// Step-up: prove it is really you, then spend the token on one action.
	mux.HandleFunc("POST /api/stepup/password", s.requireAuth(s.handleStepUpPassword))
	mux.HandleFunc("POST /api/stepup/passkey/begin", s.requireAuth(s.handleStepUpPasskeyBegin))
	mux.HandleFunc("POST /api/stepup/passkey/finish", s.requireAuth(s.handleStepUpPasskeyFinish))

	mux.HandleFunc("GET /api/audit", s.requireAuth(s.handleAuditTail))

	mux.HandleFunc("POST /api/telemetry", s.requireAuth(s.handleTelemetrySet))

	mux.HandleFunc("GET /api/bugs", s.requireAuth(s.handleBugsStatus))
	mux.HandleFunc("POST /api/bugs", s.requireAuth(s.handleBugCreate))

	mux.HandleFunc("GET /api/updates", s.requireAuth(s.handleUpdatesGet))
	mux.HandleFunc("POST /api/updates/apply", s.requireElevated(s.handleUpdatesApply))
	mux.HandleFunc("GET /api/updates/status", s.requireAuth(s.handleUpdatesStatus))
}

// routeConnections covers the databases the operator connects out to.
func (s *Server) routeConnections(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/engines", s.requireAuth(s.handleEngines))
	mux.HandleFunc("GET /api/connections", s.requireAuth(s.handleConnectionList))
	mux.HandleFunc("POST /api/connections", s.requireAuth(s.handleConnectionCreate))
	mux.HandleFunc("POST /api/connections/test", s.requireAuth(s.handleConnectionTest))
	mux.HandleFunc("PATCH /api/connections/{id}", s.requireAuth(s.handleConnectionUpdate))
	mux.HandleFunc("DELETE /api/connections/{id}", s.requireElevated(s.handleConnectionDelete))
}

// routeData covers schema browsing, row editing and the SQL console.
func (s *Server) routeData(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/databases", s.requireAuth(s.handleDatabases))
	mux.HandleFunc("GET /api/databases/details", s.requireAuth(s.handleDatabaseDetails))
	mux.HandleFunc("POST /api/databases", s.requireAuth(s.handleDatabaseCreate))
	mux.HandleFunc("DELETE /api/databases/{name}", s.requireElevated(s.handleDatabaseDrop))
	mux.HandleFunc("GET /api/databases/{name}/extensions", s.requireAuth(s.handleDatabaseExtensions))

	mux.HandleFunc("GET /api/tables", s.requireAuth(s.handleTables))
	mux.HandleFunc("GET /api/tables/{schema}/{table}", s.requireAuth(s.handleTableDetail))
	mux.HandleFunc("GET /api/tables/{schema}/{table}/rows", s.requireAuth(s.handleTableRows))
	mux.HandleFunc("POST /api/tables/{schema}/{table}/rows", s.requireAuth(s.handleRowChanges))

	mux.HandleFunc("GET /api/completions", s.requireAuth(s.handleCompletions))
	mux.HandleFunc("POST /api/query", s.requireAuth(s.handleQuery))
	mux.HandleFunc("GET /api/activity", s.requireAuth(s.handleActivity))
	mux.HandleFunc("POST /api/activity/{pid}/terminate", s.requireElevated(s.handleTerminate))
}

// routeAgent covers the privileged calls proxied to the host agent.
func (s *Server) routeAgent(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/agent/status", s.requireAuth(s.handleAgentStatus))
	mux.HandleFunc("GET /api/agent/stats", s.requireAuth(s.handleAgentStats))
	mux.HandleFunc("GET /api/agent/discover", s.requireAuth(s.handleAgentDiscover))
	mux.HandleFunc("POST /api/agent/service/{action}", s.requireAuth(s.handleAgentService))
	mux.HandleFunc("GET /api/agent/backups", s.requireAuth(s.handleBackupsList))
	mux.HandleFunc("POST /api/agent/backups", s.requireAuth(s.handleBackupCreate))
	mux.HandleFunc("GET /api/agent/logs", s.requireAuth(s.handleAgentLogs))
}
