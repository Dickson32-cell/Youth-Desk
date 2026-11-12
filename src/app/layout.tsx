import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import "./globals.css";

// Live theme: render per request so officer color edits apply on the next page view.
export const instant = false;

export const metadata: Metadata = {
  title: "Youth Desk — Municipal Assembly",
  description: "Report an issue, track it, and find youth opportunities.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const t = await prisma.siteTheme.findUnique({ where: { id: 1 }, select: { primary: true, accent: true } }).catch(() => null);
  const primary = t?.primary || "#1C3F6E";
  const accent = t?.accent || "#B88721";
  return (
    <html lang="en">
      <head>
        <style
          // Officer-chosen colors override the token defaults everywhere.
          dangerouslySetInnerHTML={{
            __html:
              `:root{--navy:${primary};--navy-800:color-mix(in srgb, ${primary} 78%, black);` +
              `--gold:${accent};}` +
              `[data-theme=dark]:root{--navy:${primary};}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
