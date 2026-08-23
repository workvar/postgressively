const KEY = "pgsv_sidebar_collapsed";

/** Reads the saved sidebar state. Defaults to expanded. */
export function readCollapsed(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

export function writeCollapsed(collapsed: boolean) {
  try {
    window.localStorage.setItem(KEY, collapsed ? "1" : "0");
  } catch {
    // Private browsing can refuse storage; the preference is not worth failing over.
  }
}
