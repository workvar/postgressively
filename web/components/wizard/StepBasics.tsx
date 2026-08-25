"use client";

import SelectCard from "@/components/ui/SelectCard";
import Badge from "@/components/ui/Badge";
import { Field, Input } from "@/components/ui/Field";
import { templates, validateName, type DraftDatabase } from "@/lib/wizard";

export default function StepBasics({
  draft,
  set,
}: {
  draft: DraftDatabase;
  set: (patch: Partial<DraftDatabase>) => void;
}) {
  const nameError = draft.name ? validateName(draft.name) : null;

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-1 text-subtitle">1. Name your database</h2>
        <p className="mb-3 text-small text-fg-muted">
          This becomes the Postgres database name and appears in every connection string.
        </p>
        <div className="max-w-sm">
          <Field label="Database name" hint={nameError ?? "Lowercase letters, digits, underscores or hyphens."}>
            <Input
              value={draft.name}
              onChange={(e) => set({ name: e.target.value.toLowerCase() })}
              placeholder="my_app_production"
              autoFocus
              aria-invalid={Boolean(nameError)}
              className={nameError ? "!border-danger" : ""}
            />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-subtitle">2. Pick a starting template</h2>
        <p className="mb-3 text-small text-fg-muted">
          Templates preselect extensions. You can change them in the next step.
        </p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {templates.map((t) => (
            <SelectCard
              key={t.id}
              selected={draft.template === t.id}
              onSelect={() => set({ template: t.id, extensions: t.extensions })}
              title={t.name}
              description={t.description}
              meta={
                t.extensions.length ? (
                  <Badge tone="accent">{t.extensions.length} ext</Badge>
                ) : (
                  <Badge>bare</Badge>
                )
              }
            />
          ))}
        </div>
      </section>
    </div>
  );
}
