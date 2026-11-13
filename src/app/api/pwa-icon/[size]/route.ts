import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { readFileSync } from "fs";
import path from "path";

// PWA install/home-screen icons that FOLLOW the officer's uploaded logo.
// size: 192 | 512 | 512m (maskable). The variants are generated in the
// officer's browser at logo-upload time and stored as SiteImage slots
// icon192/icon512/icon512m. When no logo is uploaded we fall back to the
// built-in YD tiles shipped in /public.
const SIZES: Record<string, { slot: string; fallback: string }> = {
  "192": { slot: "icon192", fallback: "icons-192.png" },
  "512": { slot: "icon512", fallback: "icons-512.png" },
  "512m": { slot: "icon512m", fallback: "maskable-512.png" },
};

export async function GET(_req: NextRequest, { params }: { params: Promise<{ size: string }> }) {
  const { size: raw } = await params;
  const cfg = SIZES[raw];
  if (!cfg) return new NextResponse("Not found", { status: 404 });
  const row = await prisma.siteImage.findFirst({ where: { slot: cfg.slot }, orderBy: { id: "desc" }, select: { mimeType: true, data: true } });
  if (row) {
    const bytes = Buffer.from(row.data);
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": row.mimeType,
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=3600, stale-while-revalidate=600",
        "Access-Control-Allow-Origin": "*",
      },
    });
  }
  // Built-in fallback tile
  try {
    const bytes = readFileSync(path.join(process.cwd(), "public", cfg.fallback));
    return new NextResponse(new Uint8Array(bytes), {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Content-Length": String(bytes.length),
        "Cache-Control": "public, max-age=86400, immutable",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
