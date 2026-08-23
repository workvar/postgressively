"use client";

import { useCallback, useEffect, useState } from "react";
import { readCollapsed, writeCollapsed } from "@/lib/sidebar";

/**
 * Sidebar collapse state, persisted per browser and toggleable with ⌘/Ctrl+B.
 *
 * The first render always uses the expanded default so the server and client
 * markup match; the saved preference is applied in an effect straight after.
 */
export function useSidebar() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    setCollapsed(readCollapsed());
  }, []);

  const toggle = useCallback(() => {
    setCollapsed((c) => {
      writeCollapsed(!c);
      return !c;
    });
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "b") {
        e.preventDefault();
        toggle();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [toggle]);

  return { collapsed, toggle };
}
