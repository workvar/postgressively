"use client";

import Combobox from "@/components/ui/Combobox";
import { bytes } from "@/lib/format";
import type { Database } from "@/lib/types";

export default function DatabasePicker({
  databases,
  value,
  onChange,
  disabled,
}: {
  databases: Database[];
  value: string;
  onChange: (db: string) => void;
  disabled?: boolean;
}) {
  const options = databases.map((d) => ({
    value: d.name,
    label: d.name,
    hint: `${d.owner} · ${bytes(d.sizeBytes)}${d.isDefault ? " · default" : ""}`,
  }));

  return (
    <div className="flex items-center gap-2">
      <span className="shrink-0 text-small text-fg-muted">Database</span>
      <Combobox
        aria-label="Database"
        options={options}
        value={value}
        onChange={onChange}
        disabled={disabled || options.length === 0}
        placeholder={options.length === 0 ? "No databases" : "Search databases…"}
        emptyText="No databases match"
        className="w-full max-w-[260px]"
      />
    </div>
  );
}
