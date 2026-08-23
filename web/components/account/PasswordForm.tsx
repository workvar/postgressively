"use client";

import { FormEvent, useState } from "react";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { ErrorNote } from "@/components/ui/Panel";
import { MIN_PASSWORD_LENGTH, changePassword } from "@/lib/account";
import { setToken } from "@/lib/auth";

/** Rotates the stored console password without signing the user out. */
export default function PasswordForm() {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setDone(false);
    if (next !== confirm) {
      setError("New passwords do not match.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const session = await changePassword(current, next);
      setToken(session.token);
      setCurrent("");
      setNext("");
      setConfirm("");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not change password");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="max-w-[400px]">
      <div className="space-y-3">
        <Field label="Current password" htmlFor="current">
          <Input
            id="current"
            type="password"
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            autoComplete="current-password"
            required
          />
        </Field>
        <Field
          label="New password"
          htmlFor="next"
          hint={`At least ${MIN_PASSWORD_LENGTH} characters, mixing letters with a digit or symbol.`}
        >
          <Input
            id="next"
            type="password"
            value={next}
            onChange={(e) => setNext(e.target.value)}
            autoComplete="new-password"
            required
          />
        </Field>
        <Field label="Confirm new password" htmlFor="confirm">
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
      {done && (
        <p className="mt-4 rounded-lg border border-success/25 bg-success-soft px-3 py-2.5 text-small text-success">
          Password updated.
        </p>
      )}

      <Button type="submit" size="md" disabled={busy} className="mt-5">
        {busy ? "Updating…" : "Update password"}
      </Button>
    </form>
  );
}
