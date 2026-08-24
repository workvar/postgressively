export type NavItem = { href: string; label: string; icon: string };
export type NavGroup = { title: string | null; items: NavItem[] };

export const navGroups: NavGroup[] = [
  { title: null, items: [{ href: "/", label: "Overview", icon: "gauge" }] },
  {
    title: "Connect",
    items: [
      { href: "/connections", label: "Connections", icon: "plug" },
      { href: "/databases", label: "Databases", icon: "stack" },
      { href: "/instances", label: "Instances", icon: "server" },
      { href: "/tables", label: "Tables", icon: "database" },
      { href: "/query", label: "SQL console", icon: "terminal" },
    ],
  },
  { title: "Operate", items: [{ href: "/server", label: "Server", icon: "server" }] },
  {
    title: "Help",
    items: [
      { href: "/updates", label: "Updates", icon: "spark" },
      { href: "/bugs", label: "Report a bug", icon: "bug" },
    ],
  },
];

const crumbMap: Record<string, string[]> = {
  "/": ["Overview"],
  "/connections": ["Connect", "Connections"],
  "/databases": ["Connect", "Databases"],
  "/instances": ["Connect", "Instances"],
  "/tables": ["Connect", "Tables"],
  "/query": ["Connect", "SQL console"],
  "/server": ["Operate", "Server"],
  "/databases/new": ["Databases", "New database"],
  "/account": ["Account"],
  "/bugs": ["Help", "Report a bug"],
  "/updates": ["Help", "Updates"],
};

export function crumbsFor(pathname: string): string[] {
  return crumbMap[pathname] ?? ["Overview"];
}
