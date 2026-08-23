import { api } from "./api";

export type EngineKind = "postgres" | "mysql" | "sqlite" | "sqlserver";

/** What the backend can connect to, and which features each engine supports. */
export type EngineDescriptor = {
  kind: EngineKind;
  label: string;
  example: string;
  remote: boolean;
  editable: boolean;
  schemas: boolean;
  manageable: boolean;
};

/** A saved database. The connection string itself never leaves the backend. */
export type Connection = {
  id: number;
  name: string;
  engine: EngineKind;
  database: string;
  endpoint: string;
  /** The connection string with its password replaced by ***. */
  redacted: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
  lastUsedAt: string | null;
  editable: boolean;
  schemas: boolean;
};

export type ConnectionTest = {
  ok: boolean;
  engine: string;
  version: string;
  database: string;
  endpoint: string;
  tables: number;
  databases: number;
  elapsedMs: number;
  error?: string;
};

export type ConnectionSpec = {
  name: string;
  engine: EngineKind;
  dsn: string;
};

export const fetchEngines = () => api.get<EngineDescriptor[]>("/api/engines");

export const fetchConnections = () => api.get<Connection[]>("/api/connections");

export const testConnection = (spec: ConnectionSpec) =>
  api.post<ConnectionTest>("/api/connections/test", spec);

export const createConnection = (spec: ConnectionSpec) =>
  api.post<Connection>("/api/connections", spec);

/** An empty dsn renames the connection and keeps the stored credentials. */
export const updateConnection = (id: number, spec: Partial<ConnectionSpec>) =>
  api.patch<Connection>(`/api/connections/${id}`, spec);

export const deleteConnection = (id: number) =>
  api.del<{ deleted: string }>(`/api/connections/${id}`, {
    reason: "Removing a connection deletes the only copy of its password.",
  });
