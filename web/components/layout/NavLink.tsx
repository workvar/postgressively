"use client";

import Link from "next/link";
import NavIcon from "./NavIcon";
import type { NavItem } from "./nav";

/**
 * One sidebar entry. Collapsed, it shrinks to a centred icon and relies on the
 * native tooltip for its label, which is what makes the slim rail readable.
 */
export default function NavLink({
  item,
  active,
  collapsed,
}: {
  item: NavItem;
  active: boolean;
  collapsed: boolean;
}) {
  return (
    <Link
      href={item.href}
      title={collapsed ? item.label : undefined}
      aria-label={collapsed ? item.label : undefined}
      aria-current={active ? "page" : undefined}
      className={`flex h-9 items-center rounded-lg text-small transition-colors duration-150 ease-apple ${
        collapsed ? "justify-center px-0" : "gap-2.5 px-2.5"
      } ${
        active
          ? "bg-accent-soft font-semibold text-accent"
          : "text-fg-muted hover:bg-surface-2 hover:text-fg"
      }`}
    >
      <NavIcon name={item.icon} />
      {!collapsed && <span className="truncate">{item.label}</span>}
    </Link>
  );
}
