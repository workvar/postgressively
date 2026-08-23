export type Database = {
  name: string;
  owner: string;
  sizeBytes: number;
  /** True for the database in the configured connection URL. */
  isDefault?: boolean;
};

export type DatabaseDetail = {
  name: string;
  owner: string;
  sizeBytes: number;
  encoding: string;
  collate: string;
  ctype: string;
  connectionLimit: number;
  allowConnections: boolean;
  isTemplate: boolean;
  activeConnections: number;
  isCurrent: boolean;
};

export type Extension = {
  name: string;
  version: string;
  schema: string;
};

export type CreateDatabaseResult = {
  name: string;
  owner: string;
  ownerCreated: boolean;
  generatedPassword?: string;
  extensions: string[];
};

export type Table = {
  schema: string;
  name: string;
  kind: string;
  estimatedRows: number;
  sizeBytes: number;
};

export type Column = {
  name: string;
  type: string;
  nullable: boolean;
  default: string | null;
  isPrimaryKey: boolean;
};

export type Index = { name: string; definition: string };

export type TableDetail = {
  schema: string;
  table: string;
  columns: Column[];
  indexes: Index[];
  /** The engine behind the selected connection: postgres, mysql, … */
  engine?: string;
  /** False where the console cannot write rows back on this engine. */
  editable?: boolean;
};

export type QueryResult = {
  columns: string[];
  rows: unknown[][];
  rowCount: number;
  truncated: boolean;
  command: string;
  durationMs: number;
};

export type Activity = {
  pid: number;
  user: string | null;
  database: string | null;
  state: string | null;
  query: string | null;
  secondsActive: number;
};

export type AgentStatus = {
  service: string;
  active: string;
  enabled: string;
  version: string;
  host: string;
  port: number;
  /** Init system driving the service: systemd, brew-services, pg_ctl, or none. */
  manager?: string;
  canControl?: boolean;
  managerError?: string;
  agentError?: string;
  versionNum?: number;
  startedAt?: string;
  uptimeSeconds?: number;
  dataDir?: string;
};

/** A database engine the agent found running or installed on its host. */
export type DiscoveredInstance = {
  engine: string;
  label: string;
  host?: string;
  port?: number;
  listening: boolean;
  process?: string;
  version?: string;
  binary?: string;
  managed: boolean;
  source: "port" | "binary" | "both";
};

export type Me = {
  username: string;
  readOnly: boolean;
  maxRows: number;
  metaDatabase: string;
  passkeys: boolean;
};

export type Passkey = {
  id: number;
  label: string;
  transports: string[];
  backupEligible: boolean;
  backedUp: boolean;
  createdAt: string;
  lastUsedAt: string | null;
};

export type AuditEntry = {
  id: number;
  actor: string;
  action: string;
  target: string;
  detail: Record<string, unknown>;
  createdAt: string;
};

/** Identifiers the SQL console offers as type-ahead for one database. */
export type CompletionSource = {
  database: string;
  schemas: string[];
  relations: { schema: string; name: string; kind: string }[];
  functions: string[];
  /** Keyed by "schema.table". */
  columns: Record<string, string[]>;
};

/** One pending grid edit, in the shape the backend expects. */
export type RowChange = {
  kind: "insert" | "update" | "delete";
  values?: Record<string, unknown>;
  key?: Record<string, unknown>;
};

export type ChangeResult = {
  script: string[];
  applied: boolean;
  rowsAffected: number;
  inserts: number;
  updates: number;
  deletes: number;
};
