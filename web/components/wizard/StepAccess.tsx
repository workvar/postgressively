"use client";

import Combobox from "@/components/ui/Combobox";
import { Field, Input, Toggle } from "@/components/ui/Field";
import { poolModes, type DraftDatabase } from "@/lib/wizard";

export default function StepAccess({
  draft,
  set,
}: {
  draft: DraftDatabase;
  set: (patch: Partial<DraftDatabase>) => void;
}) {
  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-1 text-subtitle">Owner and limits</h2>
        <p className="mb-3 text-small text-fg-muted">
          The owner role gets full privileges on the new database.
        </p>
        <div className="grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Owner role">
            <Input value={draft.owner} onChange={(e) => set({ owner: e.target.value.toLowerCase() })} />
          </Field>
          <Field label="Connection limit" hint="-1 for unlimited.">
            <Input
              type="number"
              value={draft.connectionLimit}
              onChange={(e) => set({ connectionLimit: Number(e.target.value) })}
            />
          </Field>
        </div>
        <div className="mt-3 max-w-lg">
          <Toggle
            checked={draft.createOwner}
            onChange={(v) => set({ createOwner: v })}
            label="Create the role if it does not exist"
            hint="A random password is generated and shown once after creation."
          />
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-subtitle">Connection pooling</h2>
        <p className="mb-3 text-small text-fg-muted">
          Recommended when many short-lived clients connect, such as serverless functions.
        </p>
        <div className="max-w-lg space-y-3">
          <Toggle
            checked={draft.pooling}
            onChange={(v) => set({ pooling: v })}
            label="Enable a PgBouncer pool"
            hint="Adds a second endpoint on a dedicated port."
          />
          {draft.pooling && (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <Field label="Pool mode">
                <Combobox
                  aria-label="Pool mode"
                  options={poolModes.map((m) => ({ value: m, label: m }))}
                  value={draft.poolMode}
                  onChange={(poolMode) => set({ poolMode })}
                />
              </Field>
              <Field label="Pool size">
                <Input
                  type="number"
                  value={draft.poolSize}
                  onChange={(e) => set({ poolSize: Number(e.target.value) })}
                />
              </Field>
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
