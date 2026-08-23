import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Postggresively",
    template: "%s · Postggresively",
  },
  description: "A friendly web console for the Postgres running on your server.",
  applicationName: "Postggresively",
  icons: { icon: "/icon.svg", apple: "/icon.svg" },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  colorScheme: "light",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" style={{ colorScheme: "light" }}>
      <body className="min-h-screen bg-canvas text-fg antialiased">{children}</body>
    </html>
  );
}
