export default function Stepper({
  steps,
  current,
  onJump,
}: {
  steps: readonly string[];
  current: number;
  onJump?: (i: number) => void;
}) {
  return (
    <ol className="flex flex-wrap items-center gap-x-2 gap-y-2">
      {steps.map((label, i) => {
        const done = i < current;
        const active = i === current;
        return (
          <li key={label} className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onJump && i <= current && onJump(i)}
              disabled={!onJump || i > current}
              className="flex items-center gap-2 disabled:cursor-default"
            >
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-full border text-micro font-semibold transition-colors duration-150 ease-apple ${
                  done
                    ? "border-accent bg-accent text-white"
                    : active
                      ? "border-accent text-accent"
                      : "border-line-strong text-fg-subtle"
                }`}
              >
                {done ? "✓" : i + 1}
              </span>
              <span
                className={`text-small ${active ? "font-semibold text-fg" : done ? "text-fg-muted" : "text-fg-subtle"}`}
              >
                {label}
              </span>
            </button>
            {i < steps.length - 1 && <span className="mx-1 h-px w-6 bg-line-strong" aria-hidden />}
          </li>
        );
      })}
    </ol>
  );
}
