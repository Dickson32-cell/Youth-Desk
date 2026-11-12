import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

function hex6(v: unknown): string | null {
  return typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v.trim()) ? v.trim().toUpperCase() : null;
}

export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const t = await prisma.siteTheme.findUnique({ where: { id: 1 } });
  return NextResponse.json({ theme: t || { primary: "#1C3F6E", accent: "#B88721" } });
}

export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const primary = hex6(b.primary);
  const accent = hex6(b.accent);
  if (!primary || !accent) return NextResponse.json({ error: "Pick valid colors (e.g. #1C3F6E)" }, { status: 400 });
  const t = await prisma.siteTheme.upsert({
    where: { id: 1 },
    update: { primary, accent },
    create: { id: 1, primary, accent },
  });
  return NextResponse.json({ ok: true, theme: t });
}
