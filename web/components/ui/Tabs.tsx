export default function Tabs<T extends string>({
  tabs,
  value,
  onChange,
}: {
  tabs: readonly T[];
  value: T;
  onChange: (t: T) => void;
}) {
  return (
    <div role="tablist" className="flex items-center gap-5 overflow-x-auto border-b border-line">
      {tabs.map((t) => {
        const active = t === value;
        return (
          <button
            key={t}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(t)}
            className={`relative h-9 whitespace-nowrap text-small capitalize transition-colors duration-150 ease-apple ${
              active ? "font-semibold text-accent" : "text-fg-muted hover:text-fg"
            }`}
          >
            {t}
            <span
              className={`absolute inset-x-0 -bottom-px h-[2px] rounded-full bg-accent transition-opacity duration-150 ease-apple ${
                active ? "opacity-100" : "opacity-0"
              }`}
            />
          </button>
        );
      })}
    </div>
  );
}
