"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import AuthLayout from "@/components/auth/AuthLayout";
import SetupForm from "@/components/setup/SetupForm";
import { getSetupStatus } from "@/lib/account";

export default function SetupPage() {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  // Setup runs once. If an account already exists, send people to sign in.
  useEffect(() => {
    let active = true;
    getSetupStatus()
      .then((s) => {
        if (!active) return;
        if (s.needsSetup) setReady(true);
        else router.replace("/login");
      })
      .catch(() => active && setReady(true));
    return () => {
      active = false;
    };
  }, [router]);

  if (!ready) return null;

  return (
    <AuthLayout
      title="Set a console password"
      subtitle="Postgres is connected. Create the account you will use to sign in from now on."
    >
      <SetupForm />
    </AuthLayout>
  );
}
