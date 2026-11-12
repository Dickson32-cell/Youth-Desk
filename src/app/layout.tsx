import type { Metadata } from "next";
import { prisma } from "@/lib/db";
import "./globals.css";

// Live theme + brand words: render per request so officer edits apply on the next view.
export const instant = false;

export const metadata: Metadata = {
  title: "Youth Desk NJSMA",
  description: "The youth desk of the New Juaben South Municipal Assembly: report an issue, track it, find opportunities.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [t, texts] = await Promise.all([
    prisma.siteTheme.findUnique({ where: { id: 1 }, select: { primary: true, accent: true } }).catch(() => null),
    prisma.siteText.findMany({ where: { key: { in: ["brand_main", "brand_sub"] } }, select: { key: true, value: true } }).catch(() => [] as { key: string; value: string }[]),
  ]);
  const map = Object.fromEntries(texts.map((r) => [r.key, r.value]));
  const primary = t?.primary || "#1C3F6E";
  const accent = t?.accent || "#B88721";
  const brandMain = map.brand_main || "Youth Desk NJSMA";
  const brandSub = map.brand_sub || "NJSMA MUNICIPAL ASSEMBLY";
  return (
    <html lang="en" data-brand-main={brandMain} data-brand-sub={brandSub}>
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
