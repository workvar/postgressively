"use client";

import Shell from "@/components/Shell";
import PageHeader from "@/components/layout/PageHeader";
import Panel from "@/components/ui/Panel";
import UpdatePanel from "@/components/updates/UpdatePanel";

export default function UpdatesPage() {
  return (
    <Shell>
      <PageHeader
        title="Updates"
        description="Check for a newer Postggresively release and apply it from this console when auto-update is available."
      />
      <Panel>
        <UpdatePanel />
      </Panel>
    </Shell>
  );
}
