"use client";

import Combobox from "@/components/ui/Combobox";
import { Field } from "@/components/ui/Field";
import { allExtensions, encodings, locales, type DraftDatabase } from "@/lib/wizard";

export default function StepConfig({
  draft,
  set,
}: {
  draft: DraftDatabase;
  set: (patch: Partial<DraftDatabase>) => void;
}) {
  function toggleExt(ext: string) {
    const has = draft.extensions.includes(ext);
    set({ extensions: has ? draft.extensions.filter((e) => e !== ext) : [...draft.extensions, ext] });
  }

  return (
    <div className="space-y-6">
      <section>
        <h2 className="mb-1 text-subtitle">Encoding and collation</h2>
        <p className="mb-3 text-small text-fg-muted">
          UTF8 with a standard locale suits almost every application.
        </p>
        <div className="grid max-w-lg grid-cols-1 gap-3 sm:grid-cols-2">
          <Field label="Encoding">
            <Combobox
              aria-label="Encoding"
              options={encodings.map((v) => ({ value: v, label: v }))}
              value={draft.encoding}
              onChange={(encoding) => set({ encoding })}
            />
          </Field>
          <Field label="Locale">
            <Combobox
              aria-label="Locale"
              options={locales.map((v) => ({ value: v, label: v }))}
              value={draft.locale}
              onChange={(locale) => set({ locale })}
            />
          </Field>
        </div>
      </section>

      <section>
        <h2 className="mb-1 text-subtitle">Extensions</h2>
        <p className="mb-3 text-small text-fg-muted">
          Installed with <code className="font-mono text-caption">CREATE EXTENSION</code> right after the
          database is created.
        </p>
        <div className="flex flex-wrap gap-2">
          {allExtensions.map((ext) => {
            const on = draft.extensions.includes(ext);
            return (
              <button
                key={ext}
                type="button"
                onClick={() => toggleExt(ext)}
                aria-pressed={on}
                className={`rounded-pill border px-3 py-1.5 font-mono text-caption transition-colors duration-150 ease-apple ${
                  on
                    ? "border-accent bg-accent-soft text-accent"
                    : "border-line bg-surface text-fg-muted hover:border-line-strong hover:text-fg"
                }`}
              >
                {on ? "✓ " : "+ "}
                {ext}
              </button>
            );
          })}
        </div>
      </section>
    </div>
  );
}
