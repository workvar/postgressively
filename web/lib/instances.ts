import type { AgentStatus, Database } from "./types";

export type Instance = {
  name: string;
  owner: string;
  sizeBytes: number;
  host: string;
  port: number;
  version: string;
  status: string;
  sslMode: string;
};

export function buildInstances(status: AgentStatus | null, databases: Database[]): Instance[] {
  return databases.map((d) => ({
    name: d.name,
    owner: d.owner,
    sizeBytes: d.sizeBytes,
    host: status?.host ?? "localhost",
    port: status?.port ?? 5432,
    version: cleanVersion(status?.version),
    status: status?.active ?? "unknown",
    sslMode: status?.host && status.host !== "localhost" ? "require" : "prefer",
  }));
}

export function cleanVersion(raw?: string): string {
  if (!raw) return "unknown";
  return raw.replace("postgres (PostgreSQL) ", "PostgreSQL ").trim();
}

/** Shown in connection strings when the real password is unknown. */
export const PASSWORD_PLACEHOLDER = "${PASSWORD}";

export function serviceUri(i: Instance, password = PASSWORD_PLACEHOLDER): string {
  return `postgresql://${i.owner}:${password}@${i.host}:${i.port}/${i.name}?sslmode=${i.sslMode}`;
}

export function psqlCommand(i: Instance): string {
  return `psql "host=${i.host} port=${i.port} dbname=${i.name} user=${i.owner} sslmode=${i.sslMode}"`;
}

export function jdbcUri(i: Instance): string {
  return `jdbc:postgresql://${i.host}:${i.port}/${i.name}?sslmode=${i.sslMode}&user=${i.owner}`;
}
