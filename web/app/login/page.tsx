"use client";

import { FormEvent, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/auth/AuthLayout";
import Button from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { ErrorNote } from "@/components/ui/Panel";
import { getSetupStatus } from "@/lib/account";
import { login } from "@/lib/api";
import { setToken } from "@/lib/auth";
import { loginWithPasskey, passkeysSupported } from "@/lib/passkeys";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [supported, setSupported] = useState(false);

  // A server with no account yet has nothing to sign in to.
  useEffect(() => {
    let active = true;
    setSupported(passkeysSupported());
    getSetupStatus()
      .then((s) => active && s.needsSetup && router.replace("/setup"))
      .catch(() => undefined);
    return () => {
      active = false;
    };
  }, [router]);

  async function finish(run: () => Promise<{ token: string }>) {
    setBusy(true);
    setError(null);
    try {
      const res = await run();
      setToken(res.token);
      router.replace("/");
    } catch (err) {
      const message = err instanceof Error ? err.message : "login failed";
      if (message === "setup required") {
        router.replace("/setup");
        return;
      }
      setError(message);
      setBusy(false);
    }
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    finish(() => login(username, password));
  }

  return (
    <AuthLayout title="Sign in" subtitle="Manage the Postgres running on your server.">
      {supported && (
        <div className="mb-5">
          <Button
            variant="secondary"
            size="md"
            className="w-full"
            disabled={busy}
            onClick={() => finish(loginWithPasskey)}
          >
            Sign in with a passkey
          </Button>
          <div className="mt-4 flex items-center gap-3">
            <span className="h-px flex-1 bg-line" />
            <span className="text-caption text-fg-subtle">or</span>
            <span className="h-px flex-1 bg-line" />
          </div>
        </div>
      )}

      <form onSubmit={onSubmit}>
        <div className="space-y-3">
          <Field label="Username" htmlFor="username">
            <Input
              id="username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username webauthn"
            />
          </Field>
          <Field label="Password" htmlFor="password">
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
            />
          </Field>
        </div>

        {error && (
          <div className="mt-4">
            <ErrorNote>{error}</ErrorNote>
          </div>
        )}

        <Button type="submit" size="md" disabled={busy} className="mt-5 w-full">
          {busy ? "Signing in…" : "Sign in"}
        </Button>

        <p className="mt-4 text-caption text-fg-subtle">
          Credentials live in the console&apos;s own database and can be changed from your account
          page, where you can also register a passkey.
        </p>
      </form>
    </AuthLayout>
  );
}
