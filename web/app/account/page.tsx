"use client";

import { useEffect, useState } from "react";
import Shell from "@/components/Shell";
import PasskeyList from "@/components/account/PasskeyList";
import PasswordForm from "@/components/account/PasswordForm";
import PageHeader from "@/components/layout/PageHeader";
import Panel from "@/components/ui/Panel";
import { api } from "@/lib/api";
import type { Me } from "@/lib/types";

export default function AccountPage() {
  const [me, setMe] = useState<Me | null>(null);

  useEffect(() => {
    api
      .get<Me>("/api/me")
      .then(setMe)
      .catch(() => setMe(null));
  }, []);

  return (
    <Shell>
      <PageHeader
        title="Account"
        description={me ? `Signed in as ${me.username}.` : "Your console sign-in details."}
      />

      <div className="space-y-5">
        <Panel
          title="Passkeys"
          description="Sign in without a password, and confirm destructive actions with your device."
        >
          <PasskeyList />
        </Panel>

        <Panel
          title="Change password"
          description={
            me
              ? `Stored as a bcrypt hash in the ${me.metaDatabase} database.`
              : "Stored as a bcrypt hash in the console's own database."
          }
        >
          <PasswordForm />
        </Panel>
      </div>
    </Shell>
  );
}
