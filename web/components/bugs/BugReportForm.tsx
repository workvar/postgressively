"use client";

import { FormEvent, useEffect, useState } from "react";
import Button from "@/components/ui/Button";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { ErrorNote } from "@/components/ui/Panel";
import { getBugReportStatus, lastConsolePath, submitBugReport } from "@/lib/bugs";
import type { BugReportResult } from "@/lib/types";

/**
 * Form that opens a GitHub Issue on the upstream repo via the backend.
 * Official release builds have a baked-in token; self-built binaries show
 * an unavailable message instead.
 */
export default function BugReportForm() {
  const [configured, setConfigured] = useState<boolean | null>(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<BugReportResult | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    getBugReportStatus()
      .then((s) => setConfigured(s.configured))
      .catch((e) => setError(e instanceof Error ? e.message : "could not load bug reporting status"));
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const created = await submitBugReport({
        title,
        description,
        path: lastConsolePath(),
        userAgent: typeof navigator !== "undefined" ? navigator.userAgent : "",
      });
      setResult(created);
      setTitle("");
      setDescription("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "could not submit bug report");
    } finally {
      setBusy(false);
    }
  }

  if (error && configured === null) return <ErrorNote>{error}</ErrorNote>;
  if (configured === null) return null;

  if (!configured) {
    return (
      <p className="text-small text-fg-muted">
        Bug reporting is not available in this build. Official release builds can file issues on
        GitHub from here.
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className="max-w-[520px]">
      <div className="space-y-3">
        <Field label="Title" htmlFor="bug-title" hint="A short summary of what went wrong.">
          <Input
            id="bug-title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={120}
            required
            placeholder="e.g. Row editor fails to save on MySQL"
          />
        </Field>
        <Field
          label="Description"
          htmlFor="bug-description"
          hint="What you expected, what happened, and steps to reproduce. App version and browser details are attached automatically."
        >
          <Textarea
            id="bug-description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={6}
            maxLength={8000}
            required
            placeholder="Steps to reproduce…"
          />
        </Field>
      </div>

      {error && (
        <div className="mt-4">
          <ErrorNote>{error}</ErrorNote>
        </div>
      )}
      {result && (
        <p className="mt-4 rounded-lg border border-success/25 bg-success-soft px-3 py-2.5 text-small text-success">
          Opened{" "}
          <a
            href={result.url}
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium underline underline-offset-2"
          >
            issue #{result.number}
          </a>
          .
        </p>
      )}

      <Button type="submit" size="md" disabled={busy || !title.trim() || !description.trim()} className="mt-5">
        {busy ? "Submitting…" : "Submit to GitHub"}
      </Button>
    </form>
  );
}
