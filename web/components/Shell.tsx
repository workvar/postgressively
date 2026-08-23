"use client";

import { usePathname } from "next/navigation";
import AuthGate from "./AuthGate";
import StepUpGate from "./security/StepUpGate";
import Sidebar from "./layout/Sidebar";
import Topbar from "./layout/Topbar";
import { crumbsFor } from "./layout/nav";
import { useSidebar } from "./layout/useSidebar";

export default function Shell({
  children,
  wide = false,
}: {
  children: React.ReactNode;
  wide?: boolean;
}) {
  const pathname = usePathname();
  const { collapsed, toggle } = useSidebar();

  return (
    <AuthGate>
      <div className="flex min-h-screen bg-canvas">
        <Sidebar collapsed={collapsed} onToggle={toggle} />
        <div className="flex min-w-0 flex-1 flex-col">
          <Topbar crumbs={crumbsFor(pathname)} />
          <main
            className={`mx-auto w-full flex-1 px-5 py-6 ${wide ? "max-w-none" : "max-w-[1400px]"}`}
          >
            {children}
          </main>
        </div>
      </div>
      <StepUpGate />
    </AuthGate>
  );
}
