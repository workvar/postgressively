"use client";

import { cell } from "@/lib/format";

/**
 * One spreadsheet cell. Reading is a plain div; editing swaps in an input so
 * the column widths never jump as the user tabs across a row.
 */
export default function GridCell({
  value,
  editing,
  selected,
  changed,
  readOnly,
  onSelect,
  onEdit,
  onCommit,
  onCancel,
  onChange,
}: {
  value: unknown;
  editing: boolean;
  selected: boolean;
  changed: boolean;
  readOnly: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onCommit: () => void;
  onCancel: () => void;
  onChange: (v: string) => void;
}) {
  const isNull = value === null || value === undefined;

  if (editing) {
    return (
      <td className="border-b border-r border-line p-0 last:border-r-0">
        <input
          autoFocus
          value={isNull ? "" : String(value)}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onCommit}
          onKeyDown={(e) => {
            if (e.key === "Enter") onCommit();
            if (e.key === "Escape") onCancel();
          }}
          className="h-8 w-full min-w-[120px] border-0 bg-accent-soft px-2 font-mono text-caption text-fg outline-none ring-1 ring-inset ring-accent"
        />
      </td>
    );
  }

  return (
    <td
      tabIndex={0}
      onFocus={onSelect}
      onClick={onSelect}
      onDoubleClick={() => !readOnly && onEdit()}
      onKeyDown={(e) => {
        if (readOnly) return;
        if (e.key === "Enter" || e.key === "F2") {
          e.preventDefault();
          onEdit();
        }
      }}
      className={`max-w-[280px] truncate border-b border-r border-line px-2 py-1.5 font-mono text-caption outline-none last:border-r-0 ${
        selected ? "ring-1 ring-inset ring-accent" : ""
      } ${changed ? "bg-warning-soft text-fg" : ""} ${
        isNull ? "italic text-fg-subtle" : "text-fg"
      }`}
    >
      {cell(value)}
    </td>
  );
}
