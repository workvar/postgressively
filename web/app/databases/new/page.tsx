"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Shell from "@/components/Shell";
import PageHeader from "@/components/layout/PageHeader";
import Stepper from "@/components/ui/Stepper";
import Button from "@/components/ui/Button";
import { ErrorNote } from "@/components/ui/Panel";
import StepBasics from "@/components/wizard/StepBasics";
import StepConfig from "@/components/wizard/StepConfig";
import StepAccess from "@/components/wizard/StepAccess";
import StepReview from "@/components/wizard/StepReview";
import SummaryRail from "@/components/wizard/SummaryRail";
import CreatedPanel from "@/components/wizard/CreatedPanel";
import { api } from "@/lib/api";
import { emptyDraft, stepIsValid, type DraftDatabase } from "@/lib/wizard";
import type { AgentStatus, CreateDatabaseResult } from "@/lib/types";

const steps = ["Basics", "Configuration", "Access", "Review"] as const;

export default function NewDatabasePage() {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [draft, setDraft] = useState<DraftDatabase>(emptyDraft);
  const [status, setStatus] = useState<AgentStatus | null>(null);
  const [result, setResult] = useState<CreateDatabaseResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get<AgentStatus>("/api/agent/status").then(setStatus).catch(() => setStatus(null));
  }, []);

  const set = (patch: Partial<DraftDatabase>) => setDraft((d) => ({ ...d, ...patch }));
  const valid = stepIsValid(step, draft);
  const canCreate = [0, 2].every((s) => stepIsValid(s, draft));

  async function create() {
    setBusy(true);
    setError(null);
    try {
      const res = await api.post<CreateDatabaseResult>("/api/databases", {
        name: draft.name,
        owner: draft.owner,
        createOwner: draft.createOwner,
        encoding: draft.encoding,
        locale: draft.locale,
        connectionLimit: draft.connectionLimit,
        extensions: draft.extensions,
      });
      setResult(res);
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    } finally {
      setBusy(false);
    }
  }

  if (result) {
    return (
      <Shell>
        <PageHeader title="Database created" description="Copy the connection details before you leave." />
        <div className="max-w-2xl">
          <CreatedPanel result={result} status={status} />
        </div>
      </Shell>
    );
  }

  return (
    <Shell>
      <PageHeader
        title="New database"
        description="Four short steps. Nothing is created until you confirm."
        action={
          <Button variant="ghost" size="sm" onClick={() => router.push("/databases")}>
            Cancel
          </Button>
        }
      />

      <div className="mb-5 rounded-xl border border-line bg-surface px-4 py-3 shadow-card">
        <Stepper steps={steps} current={step} onJump={setStep} />
      </div>

      {error && <ErrorNote>{error}</ErrorNote>}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="animate-fadeUp rounded-xl border border-line bg-surface p-5 shadow-card">
          {step === 0 && <StepBasics draft={draft} set={set} />}
          {step === 1 && <StepConfig draft={draft} set={set} />}
          {step === 2 && <StepAccess draft={draft} set={set} />}
          {step === 3 && <StepReview draft={draft} status={status} />}

          <div className="mt-6 flex items-center justify-between border-t border-line pt-4">
            <Button variant="secondary" size="md" disabled={step === 0} onClick={() => setStep((s) => s - 1)}>
              Back
            </Button>
            {step < steps.length - 1 ? (
              <Button size="md" disabled={!valid} onClick={() => setStep((s) => s + 1)}>
                Continue
              </Button>
            ) : (
              <Button variant="primary" size="md" disabled={!canCreate || busy} onClick={create}>
                {busy ? "Creating…" : "Create database"}
              </Button>
            )}
          </div>
        </div>

        <SummaryRail draft={draft} status={status} canCreate={canCreate} busy={busy} onCreate={create} />
      </div>
    </Shell>
  );
}
