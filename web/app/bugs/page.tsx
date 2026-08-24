"use client";

import Shell from "@/components/Shell";
import BugReportForm from "@/components/bugs/BugReportForm";
import PageHeader from "@/components/layout/PageHeader";
import Panel from "@/components/ui/Panel";

export default function BugsPage() {
  return (
    <Shell>
      <PageHeader
        title="Report a bug"
        description="Opens a GitHub Issue on the Postggresively repository. Include steps to reproduce when you can."
      />

      <Panel>
        <BugReportForm />
      </Panel>
    </Shell>
  );
}
