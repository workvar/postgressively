import { LOCAL_CONNECTION } from "./activeConnection";
import type { Connection } from "./connections";
import type { AgentStatus } from "./types";

export type ServerConnection = {
  id: string;
  name: string;
  kind: string;
  endpoint: string;
  status: string;
  current: boolean;
};

/**
 * The switcher lists the instance the console was installed next to, followed
 * by every database the operator saved a connection string for.
 */
export function serverList(
  status: AgentStatus | null,
  saved: Connection[],
  active: string
): ServerConnection[] {
  const local: ServerConnection = {
    id: LOCAL_CONNECTION,
    name: "Local Postgres",
    kind: "local",
    endpoint: `${status?.host ?? "localhost"}:${status?.port ?? 5432}`,
    status: status?.active ?? "unknown",
    current: active === LOCAL_CONNECTION,
  };

  return [
    local,
    ...saved.map((c) => ({
      id: String(c.id),
      name: c.name,
      kind: c.engine,
      endpoint: c.endpoint || c.database || "remote",
      // A saved connection is only saved once it has answered, so treat it
      // as reachable until a request says otherwise.
      status: "connected",
      current: active === String(c.id),
    })),
  ];
}
