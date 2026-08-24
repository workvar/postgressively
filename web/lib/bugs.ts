import { api } from "@/lib/api";
import type { BugReportResult, BugReportStatus } from "@/lib/types";

const LAST_PATH_KEY = "pg:last-path";

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

/** Remember the last console path so bug reports can cite where the user was. */
export function rememberConsolePath(pathname: string) {
  if (typeof sessionStorage === "undefined" || pathname === "/bugs") return;
  sessionStorage.setItem(LAST_PATH_KEY, pathname);
}

export function lastConsolePath(): string {
  if (typeof sessionStorage === "undefined") return "";
  return sessionStorage.getItem(LAST_PATH_KEY) ?? "";
}
