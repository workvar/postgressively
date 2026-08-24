"use client";

import { useMemo, useState } from "react";
import EnginePicker from "./EnginePicker";
import TestSummary from "./TestSummary";
import Button from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import Panel from "@/components/ui/Panel";
import {
  createConnection,
  testConnection,
  type Connection,
  type ConnectionTest,
  type EngineDescriptor,
  type EngineKind,
} from "@/lib/connections";

/**
 * Add a database by connection string. The string is tested before it is
 * saved, and once saved only its redacted form ever comes back.
 */
export default function ConnectionForm({
  engines,
  onSaved,
  onCancel,
}: {
  engines: EngineDescriptor[];
  onSaved: (created: Connection) => void;
  onCancel: () => void;
}) {
  const [name, setName] = useState("");
  const [engine, setEngine] = useState<EngineKind>("postgres");
  const [dsn, setDsn] = useState("");
  const [result, setResult] = useState<ConnectionTest | null>(null);
  const [busy, setBusy] = useState<"test" | "save" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const descriptor = useMemo(() => engines.find((e) => e.kind === engine), [engines, engine]);
  const ready = name.trim().length > 0 && dsn.trim().length > 0;

  async function run(action: "test" | "save") {
    setBusy(action);
    setError(null);
    try {
      const spec = { name: name.trim(), engine, dsn: dsn.trim() };
      if (action === "test") {
        setResult(await testConnection(spec));
      } else {
        onSaved(await createConnection(spec));
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : "request failed");
    } finally {
      setBusy(null);
    }
  }

  return (
    <Panel
      title="Add a connection"
      description="Point the console at another database. It is tested before it is saved."
    >
      <div className="grid gap-4">
        <Field label="Name" hint="How this database is listed in the switcher.">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Production analytics"
            autoFocus
          />
        </Field>

        <EnginePicker engines={engines} value={engine} onChange={setEngine} disabled={busy !== null} />

        {/* Masked from Microsoft Clarity: this carries a host, credentials
            or a file path. See web/lib/telemetry.ts. */}
        <div data-clarity-mask="true">
          <Field
            label={descriptor?.remote ? "Connection string" : "File path"}
            hint={descriptor ? `Example: ${descriptor.example}` : undefined}
          >
            <Textarea
              value={dsn}
              onChange={(e) => setDsn(e.target.value)}
              rows={3}
              spellCheck={false}
              className="font-mono text-caption"
              placeholder={descriptor?.example}
            />
          </Field>
        </div>

        <p className="text-caption text-fg-subtle">
          The password is encrypted before it is stored, and is never sent back to the browser.
        </p>

        {result && <TestSummary result={result} />}
        {error && (
          <p className="break-words text-caption text-danger" role="alert">
            {error}
          </p>
        )}

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={onCancel} disabled={busy !== null}>
            Cancel
          </Button>
          <Button variant="secondary" onClick={() => run("test")} disabled={!ready || busy !== null}>
            {busy === "test" ? "Testing…" : "Test connection"}
          </Button>
          <Button variant="brand" onClick={() => run("save")} disabled={!ready || busy !== null}>
            {busy === "save" ? "Saving…" : "Save connection"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
