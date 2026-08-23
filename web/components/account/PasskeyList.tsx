"use client";

import { useEffect, useState } from "react";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { EmptyState, ErrorNote } from "@/components/ui/Panel";
import {
  deletePasskey,
  listPasskeys,
  passkeysSupported,
  registerPasskey,
} from "@/lib/passkeys";
import type { Passkey } from "@/lib/types";

function when(value: string | null) {
  if (!value) return "never used";
  return new Date(value).toLocaleString();
}

/** Registers, lists and removes the passkeys on the signed-in account. */
export default function PasskeyList() {
  const [keys, setKeys] = useState<Passkey[] | null>(null);
  const [label, setLabel] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const supported = passkeysSupported();

  function reload() {
    listPasskeys()
      .then(setKeys)
      .catch((e) => setError(e.message));
  }

  useEffect(reload, []);

  async function add() {
    setBusy(true);
    setError(null);
    try {
      await registerPasskey(label.trim() || "Passkey");
      setLabel("");
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not register the passkey");
    } finally {
      setBusy(false);
    }
  }

  async function remove(id: number) {
    setError(null);
    try {
      await deletePasskey(id);
      reload();
    } catch (e) {
      setError(e instanceof Error ? e.message : "could not remove the passkey");
    }
  }

  if (!supported) {
    return (
      <p className="text-small text-fg-muted">
        This browser cannot use passkeys. They need a secure context, which means HTTPS or
        localhost.
      </p>
    );
  }

  return (
    <div>
      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Name this passkey, for example MacBook Touch ID"
          className="max-w-[320px]"
        />
        <Button size="md" onClick={add} disabled={busy}>
          {busy ? "Waiting for your device…" : "Add passkey"}
        </Button>
      </div>

      {keys === null && <p className="text-small text-fg-subtle">Loading…</p>}
      {keys?.length === 0 && (
        <EmptyState title="No passkeys yet">
          Add one to sign in without a password and to confirm destructive actions.
        </EmptyState>
      )}

      <ul className="divide-y divide-line rounded-xl border border-line">
        {(keys ?? []).map((k) => (
          <li key={k.id} className="flex flex-wrap items-center gap-3 px-3 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-small font-medium text-fg">{k.label}</span>
              <span className="block truncate text-caption text-fg-subtle">
                added {new Date(k.createdAt).toLocaleDateString()} · {when(k.lastUsedAt)}
              </span>
            </span>
            {k.backedUp && <Badge tone="info">synced</Badge>}
            <Button variant="danger" size="xs" onClick={() => remove(k.id)}>
              Remove
            </Button>
          </li>
        ))}
      </ul>
    </div>
  );
}
