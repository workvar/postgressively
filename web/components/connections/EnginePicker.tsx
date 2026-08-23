"use client";

import Combobox from "@/components/ui/Combobox";
import { Field } from "@/components/ui/Field";
import type { EngineDescriptor, EngineKind } from "@/lib/connections";

export default function EnginePicker({
  engines,
  value,
  onChange,
  disabled,
}: {
  engines: EngineDescriptor[];
  value: EngineKind;
  onChange: (kind: EngineKind) => void;
  disabled?: boolean;
}) {
  const options = engines.map((e) => ({
    value: e.kind,
    label: e.label,
    hint: e.remote ? "Connects over the network" : "Opens a file on this server",
  }));

  return (
    <Field label="Engine" hint="Postgres connections get the full console; others are read and query only.">
      <Combobox
        aria-label="Engine"
        options={options}
        value={value}
        onChange={(v) => onChange(v as EngineKind)}
        disabled={disabled || options.length === 0}
        placeholder="Search engines…"
        emptyText="No engines match"
      />
    </Field>
  );
}
