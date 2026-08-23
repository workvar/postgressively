import { api } from "./api";
import type { DiscoveredInstance } from "./types";

/** Fetches database engines detected on the agent's host. */
export async function fetchDiscovered(): Promise<DiscoveredInstance[]> {
  const res = await api.get<{ instances: DiscoveredInstance[] | null }>("/api/agent/discover");
  return res.instances ?? [];
}

export function discoveredKey(i: DiscoveredInstance): string {
  return `${i.engine}:${i.port ?? "none"}:${i.binary ?? ""}`;
}

/** Short explanation of how an instance was found. */
export function sourceLabel(i: DiscoveredInstance): string {
  if (!i.listening) return "Installed, not running";
  if (i.source === "both") return "Listening, binary found";
  return "Listening";
}

/** Connection string suggestion, only meaningful for engines we can address. */
export function discoveredUri(i: DiscoveredInstance): string | null {
  if (!i.listening || !i.port) return null;
  const host = i.host ?? "127.0.0.1";
  switch (i.engine) {
    case "postgres":
      return `postgresql://${host}:${i.port}/postgres`;
    case "mysql":
      return `mysql://${host}:${i.port}`;
    case "mongodb":
      return `mongodb://${host}:${i.port}`;
    case "redis":
      return `redis://${host}:${i.port}`;
    default:
      return `${host}:${i.port}`;
  }
}
