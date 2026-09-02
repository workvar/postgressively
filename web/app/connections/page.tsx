"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import ConnectionForm from "@/components/connections/ConnectionForm";
import ConnectionList from "@/components/connections/ConnectionList";
import PageHeader from "@/components/layout/PageHeader";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { ErrorNote } from "@/components/ui/Panel";
import {
  LOCAL_CONNECTION,
  activeConnection,
  onConnectionChange,
  setActiveConnection,
} from "@/lib/activeConnection";
import {
  deleteConnection,
  fetchConnections,
  fetchEngines,
  type Connection,
  type EngineDescriptor,
} from "@/lib/connections";

export default function ConnectionsPage() {
  const [engines, setEngines] = useState<EngineDescriptor[]>([]);
  const [connections, setConnections] = useState<Connection[]>([]);
  const [active, setActive] = useState(LOCAL_CONNECTION);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setActive(activeConnection());
    return onConnectionChange(setActive);
  }, []);

  useEffect(() => {
    fetchEngines().then(setEngines).catch(() => setEngines([]));
    fetchConnections()
      .then(setConnections)
      .catch((e) => setError(e.message));
  }, []);

  async function remove(c: Connection) {
    setError(null);
    try {
      await deleteConnection(c.id);
      setConnections((list) => list.filter((x) => x.id !== c.id));
      if (activeConnection() === String(c.id)) setActiveConnection(LOCAL_CONNECTION);
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not remove the connection");
    }
  }

  return (
    <Shell>
      <PageHeader
        title="Connections"
        description="Databases this console can browse: the server it runs on, plus anything you add by connection string."
        meta={
          <>
            <Badge tone="accent">{connections.length + 1} connected</Badge>
            <Badge>{engines.length} engines supported</Badge>
          </>
        }
        action={
          !adding && (
            <Button variant="primary" size="sm" onClick={() => setAdding(true)}>
              Add connection
            </Button>
          )
        }
      />

      {error && <ErrorNote>{error}</ErrorNote>}

      {adding && (
        <div className="mb-5">
          <ConnectionForm
            engines={engines}
            onCancel={() => setAdding(false)}
            onSaved={(created) => {
              setConnections((list) => [...list, created]);
              setAdding(false);
              setActiveConnection(String(created.id));
            }}
          />
        </div>
      )}

      <ConnectionList
        connections={connections}
        engines={engines}
        active={active}
        onUse={setActiveConnection}
        onDelete={remove}
      />
    </Shell>
  );
}
