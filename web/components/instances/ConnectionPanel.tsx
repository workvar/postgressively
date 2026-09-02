"use client";

import { useState } from "react";
import Panel from "@/components/ui/Panel";
import Tabs from "@/components/ui/Tabs";
import CopyRow from "@/components/ui/CopyRow";
import Button from "@/components/ui/Button";
import UriText from "@/components/ui/UriText";
import { bytes } from "@/lib/format";
import { jdbcUri, psqlCommand, serviceUri, type Instance } from "@/lib/instances";

const tabs = ["connection", "uri", "psql", "jdbc"] as const;
type Tab = (typeof tabs)[number];

export default function ConnectionPanel({ instance }: { instance: Instance }) {
  const [tab, setTab] = useState<Tab>("connection");
  const uri = serviceUri(instance);

  return (
    <Panel
      title="Connection information"
      description={`${instance.name} · ${bytes(instance.sizeBytes)} · owner ${instance.owner}`}
      tint
      padded={false}
      action={
        <Button variant="secondary" size="sm" onClick={() => navigator.clipboard?.writeText(uri)}>
          Quick connect
        </Button>
      }
    >
      <div className="px-4 pt-1">
        <Tabs tabs={tabs} value={tab} onChange={setTab} />
      </div>

      {tab === "connection" && (
        <div>
          <CopyRow label="Service URI" value={uri} secret />
          <CopyRow label="Database name" value={instance.name} />
          <CopyRow label="Host" value={instance.host} />
          <CopyRow label="Port" value={String(instance.port)} />
          <CopyRow label="User" value={instance.owner} />
          <CopyRow label="Password" value="set-in-server-config" secret />
          <CopyRow label="SSL mode" value={instance.sslMode} />
          <CopyRow label="Version" value={instance.version} />
        </div>
      )}

      {tab === "uri" && <CodeBlock value={uri} />}
      {tab === "psql" && <CodeBlock value={psqlCommand(instance)} />}
      {tab === "jdbc" && <CodeBlock value={jdbcUri(instance)} />}
    </Panel>
  );
}

function CodeBlock({ value }: { value: string }) {
  return (
    <div className="p-4">
      <pre className="overflow-x-auto rounded-lg border border-line bg-surface-2 p-3 font-mono text-caption text-fg">
        <UriText value={value} />
      </pre>
      <Button
        variant="secondary"
        size="xs"
        className="mt-2"
        onClick={() => navigator.clipboard?.writeText(value)}
      >
        Copy
      </Button>
    </div>
  );
}
