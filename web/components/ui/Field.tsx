import { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes, forwardRef } from "react";

// Shared control styling. Exported so Combobox can match native inputs exactly.
export const control =
  "w-full rounded-lg border border-line bg-surface px-3 text-small text-fg " +
  "placeholder:text-fg-subtle transition-colors duration-150 ease-apple " +
  "hover:border-line-strong focus:border-accent focus:outline-none disabled:bg-surface-2 disabled:opacity-60";

export function Input({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={`${control} h-9 ${className}`} {...props} />;
}

// Ref-forwarding: the SQL editor needs the node to read caret offsets.
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function Textarea({ className = "", ...props }, ref) {
    return (
      <textarea ref={ref} className={`${control} py-2.5 leading-relaxed ${className}`} {...props} />
    );
  }
);

export function Field({
  label,
  hint,
  htmlFor,
  children,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: ReactNode;
}) {
  return (
    <div>
      <label htmlFor={htmlFor} className="mb-1 block text-small font-medium text-fg">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-caption text-fg-subtle">{hint}</p>}
    </div>
  );
}

export function SearchInput({ className = "", ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={`relative ${className}`}>
      <svg
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden
        className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-fg-subtle"
      >
        <circle cx="9" cy="9" r="6" stroke="currentColor" strokeWidth="1.6" />
        <path d="M13.5 13.5 17 17" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      <input className={`${control} h-9 pl-9`} {...props} />
    </div>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label: string;
  hint?: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      className="flex w-full items-start gap-3 rounded-lg border border-line bg-surface p-3 text-left transition-colors duration-150 ease-apple hover:border-line-strong"
    >
      <span
        className={`mt-0.5 flex h-5 w-9 shrink-0 items-center rounded-pill p-0.5 transition-colors duration-200 ease-apple ${
          checked ? "bg-accent" : "bg-line-strong"
        }`}
      >
        <span
          className={`h-4 w-4 rounded-full bg-white shadow-card transition-transform duration-200 ease-apple ${
            checked ? "translate-x-4" : "translate-x-0"
          }`}
        />
      </span>
      <span className="min-w-0">
        <span className="block text-small font-medium text-fg">{label}</span>
        {hint && <span className="mt-0.5 block text-caption text-fg-muted">{hint}</span>}
      </span>
    </button>
  );
}
