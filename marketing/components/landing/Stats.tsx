import CountUp from "@/components/motion/CountUp";
import { Stagger } from "@/components/motion/Reveal";

const STATS = [
  { value: 4, suffix: "+", label: "Database engines" },
  { value: 3, suffix: "", label: "Deploy paths" },
  { value: 100, suffix: "%", label: "Self-hosted" },
  { value: -1, suffix: "", label: "Vendor lock-in", text: "Zero" },
];

export default function Stats() {
  return (
    <section className="border-y border-line bg-surface/50 px-5 py-14 backdrop-blur-sm md:py-16">
      <div className="mx-auto max-w-6xl">
        <Stagger
          className="grid grid-cols-2 gap-8 md:grid-cols-4 md:gap-6"
          stagger={120}
          direction="blur"
        >
          {STATS.map((stat) => (
            <div key={stat.label} className="text-center md:text-left">
              <p className="font-sans text-4xl font-semibold tracking-tight text-fg md:text-5xl">
                {stat.text ? (
                  <span>{stat.text}</span>
                ) : (
                  <CountUp value={stat.value} suffix={stat.suffix} />
                )}
              </p>
              <p className="mt-2 text-sm text-fg-muted">{stat.label}</p>
            </div>
          ))}
        </Stagger>
      </div>
    </section>
  );
}
