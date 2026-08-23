import { ReactNode } from "react";
import Logo from "@/components/brand/Logo";

const highlights: [string, string][] = [
  ["Instances and connection strings", "Copy a ready URI, psql command, or JDBC string."],
  ["Guided database creation", "Templates, extensions, pooling, all reviewed before anything runs."],
  ["Live activity and logs", "See what is querying right now and terminate what should not be."],
  ["Backups on demand", "Dump any database and keep the history on the server."],
];

/** Split-screen frame shared by the sign-in and first-run setup screens. */
export default function AuthLayout({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      <div className="flex items-center justify-center bg-canvas px-6 py-12">
        <div className="animate-fadeUp w-full max-w-[360px]">
          <Logo />
          <h1 className="mt-7 text-title">{title}</h1>
          <p className="mb-6 mt-1 text-small text-fg-muted">{subtitle}</p>
          {children}
        </div>
      </div>

      <aside className="hidden flex-col justify-center border-l border-line bg-surface px-12 lg:flex">
        <h2 className="max-w-[22ch] text-[30px] font-semibold leading-tight tracking-[-0.02em] text-fg">
          Your server&apos;s Postgres, without the terminal.
        </h2>
        <ul className="mt-7 space-y-3.5">
          {highlights.map(([heading, body]) => (
            <li key={heading} className="flex gap-3">
              <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent" />
              <span>
                <span className="block text-small font-semibold text-fg">{heading}</span>
                <span className="block text-small text-fg-muted">{body}</span>
              </span>
            </li>
          ))}
        </ul>
      </aside>
    </main>
  );
}
