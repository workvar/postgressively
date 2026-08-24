import { api } from "@/lib/api";
import type { BugReportResult, BugReportStatus } from "@/lib/types";

export function getBugReportStatus() {
  return api.get<BugReportStatus>("/api/bugs");
}

export function submitBugReport(input: {
  title: string;
  description: string;
  path?: string;
  userAgent?: string;
}) {
  return api.post<BugReportResult>("/api/bugs", input);
}
