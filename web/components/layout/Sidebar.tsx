"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import Logo from "@/components/brand/Logo";
import NavIcon from "./NavIcon";
import NavLink from "./NavLink";
import ServerSwitcher from "./ServerSwitcher";
import { navGroups } from "./nav";

export default function Sidebar({
  collapsed,
  onToggle,
}: {
  collapsed: boolean;
  onToggle: () => void;
}) {
  const pathname = usePathname();

  return (
    <aside
      data-collapsed={collapsed}
      className={`${
        collapsed ? "w-[60px]" : "w-[228px]"
      } sticky top-0 hidden h-screen shrink-0 flex-col border-r border-line bg-surface transition-[width] duration-250 ease-apple md:flex`}
    >
      <div
        className={`flex h-14 items-center border-b border-line ${
          collapsed ? "justify-center px-0" : "px-4"
        }`}
      >
        <Link href="/" aria-label="Postggresively home">
          <Logo compact={collapsed} />
        </Link>
      </div>

      <ServerSwitcher collapsed={collapsed} />

      <div className={collapsed ? "px-2 py-3" : "px-3 py-3"}>
        <Link
          href="/databases/new"
          title={collapsed ? "New database" : undefined}
          aria-label="New database"
          className="flex h-9 items-center justify-center gap-1.5 rounded-lg bg-accent text-small font-medium text-accent-fg transition-colors duration-150 ease-apple hover:bg-accent-hover"
        >
          <NavIcon name="plus" />
          {!collapsed && "New database"}
        </Link>
      </div>

      <nav className={`flex-1 overflow-y-auto pb-3 ${collapsed ? "px-2" : "px-3"}`}>
        {navGroups.map((group, gi) => (
          <div key={group.title ?? gi} className="mb-4">
            {group.title &&
              (collapsed ? (
                <div className="mx-2 mb-2 border-t border-line" aria-hidden />
              ) : (
                <p className="mb-1 px-2.5 text-micro font-semibold uppercase tracking-[0.08em] text-fg-subtle">
                  {group.title}
                </p>
              ))}
            <ul className="space-y-px">
              {group.items.map((item) => (
                <li key={item.href}>
                  <NavLink item={item} active={pathname === item.href} collapsed={collapsed} />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      <button
        onClick={onToggle}
        title={`${collapsed ? "Expand" : "Collapse"} sidebar (⌘B)`}
        aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        className="flex h-10 items-center justify-center border-t border-line text-fg-subtle transition-colors duration-150 ease-apple hover:bg-surface-2 hover:text-fg"
      >
        <svg viewBox="0 0 20 20" fill="none" className="h-4 w-4">
          <path
            d={collapsed ? "M8 5l5 5-5 5" : "M12 5l-5 5 5 5"}
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>
    </aside>
  );
}
