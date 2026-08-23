"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Button from "@/components/ui/Button";
import Modal from "@/components/ui/Modal";
import { Field, Input } from "@/components/ui/Field";
import { ErrorNote } from "@/components/ui/Panel";
import { setElevationPrompt, storeElevation } from "@/lib/elevate";
import { passkeysSupported, stepUpWithPasskey, stepUpWithPassword } from "@/lib/passkeys";

type Resolver = (token: string | null) => void;

/**
 * Renders the confirmation dialog for critical actions and wires it into
 * `lib/elevate`, so any API call that comes back needing confirmation raises
 * this prompt and then retries itself. Mounted once, inside Shell.
 */
export default function StepUpGate() {
  const [reason, setReason] = useState<string | null>(null);
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const resolver = useRef<Resolver | null>(null);

  useEffect(() => {
    setElevationPrompt(
      (why) =>
        new Promise<string | null>((resolve) => {
          resolver.current = resolve;
          setPassword("");
          setError(null);
          setReason(why);
        })
    );
    return () => setElevationPrompt(null);
  }, []);

  const finish = useCallback((token: string | null) => {
    resolver.current?.(token);
    resolver.current = null;
    setReason(null);
    setPassword("");
    setBusy(false);
  }, []);

  async function confirm(run: () => Promise<{ elevatedToken: string; expiresAt: string }>) {
    setBusy(true);
    setError(null);
    try {
      const res = await run();
      storeElevation(res.elevatedToken, res.expiresAt);
      finish(res.elevatedToken);
    } catch (e) {
      setError(e instanceof Error ? e.message : "confirmation failed");
      setBusy(false);
    }
  }

  return (
    <Modal
      open={reason !== null}
      title="Confirm it is you"
      description={reason ?? undefined}
      onClose={() => finish(null)}
      footer={
        <>
          <Button variant="ghost" size="sm" onClick={() => finish(null)} disabled={busy}>
            Cancel
          </Button>
          <Button
            size="sm"
            disabled={busy || password.length === 0}
            onClick={() => confirm(() => stepUpWithPassword(password))}
          >
            {busy ? "Checking…" : "Confirm"}
          </Button>
        </>
      }
    >
      {passkeysSupported() && (
        <div className="mb-4">
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            disabled={busy}
            onClick={() => confirm(stepUpWithPasskey)}
          >
            Use a passkey
          </Button>
          <p className="mt-3 text-center text-caption text-fg-subtle">or use your password</p>
        </div>
      )}

      <Field label="Password" htmlFor="stepup-password">
        <Input
          id="stepup-password"
          type="password"
          autoFocus
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && password) confirm(() => stepUpWithPassword(password));
          }}
          autoComplete="current-password"
        />
      </Field>

      {error && (
        <div className="mt-3">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
    </Modal>
  );
}
