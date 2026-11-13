import type { Metadata, Viewport } from "next";
import { prisma } from "@/lib/db";
import "./globals.css";

const METADATA_BASE = new URL(process.env.YD_METADATA_BASE || "https://youth-desk-abdul-rashid-dicksons-projects.vercel.app");

// Live theme + brand words: render per request so officer edits apply on the next view.
export const instant = false;

export const viewport: Viewport = { themeColor: "#1C3F6E" };

// Dynamic metadata: the WhatsApp/Telegram link card follows the officer's
// logo (og:image) and the officer-edited brand words.
export async function generateMetadata({ }: { params: Promise<Record<string, never>> }): Promise<Metadata> {
  const [texts, logo] = await Promise.all([
    prisma.siteText.findMany({ where: { key: { in: ["brand_main"] } }, select: { key: true, value: true } }).catch(() => [] as { key: string; value: string }[]),
    prisma.siteImage.findFirst({ where: { slot: "logo" }, orderBy: { id: "desc" }, select: { id: true } }).catch(() => null),
  ]);
  const brandMain = texts.find((t) => t.key === "brand_main")?.value || "Youth Desk NJSMA";
  const description = "The youth desk of the New Juaben South Municipal Assembly: report an issue, track it, find opportunities.";
  const logoUrl = logo ? "/api/media/" + logo.id : "/api/pwa-icon/192";
  return {
    metadataBase: METADATA_BASE,
    title: brandMain,
    description,
    manifest: "/manifest.webmanifest",
    appleWebApp: { capable: true, title: brandMain, statusBarStyle: "black-translucent" },
    icons: { icon: logoUrl, apple: logoUrl },
    openGraph: {
      title: brandMain,
      description,
      siteName: brandMain,
      type: "website",
      images: [{ url: logoUrl, width: 512, height: 512, alt: brandMain }],
    },
    twitter: { card: "summary", title: brandMain, description, images: [logoUrl] },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [t, texts, logo] = await Promise.all([
    prisma.siteTheme.findUnique({ where: { id: 1 }, select: { primary: true, accent: true } }).catch(() => null),
    prisma.siteText.findMany({ where: { key: { in: ["brand_main", "brand_sub"] } }, select: { key: true, value: true } }).catch(() => [] as { key: string; value: string }[]),
    prisma.siteImage.findFirst({ where: { slot: "logo" }, orderBy: { id: "desc" }, select: { id: true } }).catch(() => null),
  ]);
  const map = Object.fromEntries(texts.map((r) => [r.key, r.value]));
  const primary = t?.primary || "#1C3F6E";
  const accent = t?.accent || "#B88721";
  const brandMain = map.brand_main || "Youth Desk NJSMA";
  const brandSub = map.brand_sub || "NEW JUABEN SOUTH MUNICIPAL ASSEMBLY";
  return (
    <html lang="en" data-brand-main={brandMain} data-brand-sub={brandSub} data-logo-url={logo ? "/api/media/" + logo.id : undefined}>
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
        <script
          // Self-heal: a tab opened on an older deployment dies on vanished chunks
          // (Next chunk-load error). One automatic reload per session clears it.
          dangerouslySetInnerHTML={{
            __html:
              "window.addEventListener('error',function(e){try{var m=(e&&e.message)||'';" +
              "if(/ChunkLoadError|Loading chunk|dynamically imported module|Failed to fetch dynamically/i.test(m)" +
              "&&!window.__ydw_heal){window.__ydw_heal='1';sessionStorage.setItem('ydw_heal','1');location.reload();}}catch(_){}},true);" +
              "window.addEventListener('unhandledrejection',function(e){try{var m=(e&&e.reason&&e.reason.message)||'as';" +
              "if(/ChunkLoadError|Loading chunk|dynamically imported module|Failed to fetch dynamically/i.test(m)" +
              "&&!sessionStorage.getItem('ydw_heal')){sessionStorage.setItem('ydw_heal','1');location.reload();}}catch(_){}},true);",
          }}
        />
        <script
          // Install the web-app service worker (PWA shell). Fail-open by design:
          // an unregistered SW simply leaves the site as a normal web page.
          dangerouslySetInnerHTML={{
            __html: "if('serviceWorker' in navigator){window.addEventListener('load',function(){try{navigator.serviceWorker.register('/sw.js').catch(function(_){});}catch(_){}});}",
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
