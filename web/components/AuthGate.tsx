"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getSetupStatus } from "@/lib/account";
import { getToken } from "@/lib/auth";

/**
 * Guards every signed-in route. Until a console account exists, all paths
 * funnel to /setup; after that, a missing token funnels to /login.
 */
export default function AuthGate({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    getSetupStatus()
      .then((s) => {
        if (!active) return;
        if (s.needsSetup) router.replace("/setup");
        else if (!getToken()) router.replace("/login");
        else setReady(true);
      })
      .catch(() => {
        // Backend unreachable: fall back to the token check so the page can
        // render its own error state rather than hanging on a blank screen.
        if (!active) return;
        if (!getToken()) router.replace("/login");
        else setReady(true);
      });
    return () => {
      active = false;
    };
  }, [router]);

  if (!ready) return null;
  return <>{children}</>;
}
