"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { ErrorNote } from "@/components/ui/Panel";
import { MIN_PASSWORD_LENGTH, completeSetup } from "@/lib/account";
import { setToken } from "@/lib/auth";

/** First-run form: creates the console account stored in Postgres. */
export default function SetupForm() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const session = await completeSetup(username.trim(), password);
      setToken(session.token);
      router.replace("/");
    } catch (err) {
      setError(err instanceof Error ? err.message : "setup failed");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit}>
      <div className="space-y-3">
        <Field label="Username" htmlFor="username" hint="Letters, digits, dot, underscore or hyphen.">
          <Input
            id="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            autoComplete="username"
            required
          />
        </Field>
        <Field
          label="Password"
          htmlFor="password"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters, mixing letters with a digit or symbol.`}
        >
          <Input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        <Field label="Confirm password" htmlFor="confirm">
          <Input
            id="confirm"
            type="password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}

      <Button type="submit" size="md" disabled={busy} className="mt-5 w-full">
        {busy ? "Creating account…" : "Create account"}
      </Button>

      <p className="mt-4 text-caption text-fg-subtle">
        Stored as a bcrypt hash in the <code>postggresively</code> schema of the connected
        database. You can change it later from your account page.
      </p>
    </form>
  );
}
