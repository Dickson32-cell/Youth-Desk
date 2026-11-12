import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

// Editable words of the public site. GET returns every stored override.
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const rows = await prisma.siteText.findMany({ select: { key: true, value: true } });
  const texts: Record<string, string> = {};
  for (const r of rows) texts[r.key] = r.value;
  return NextResponse.json({ texts });
}

export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const texts: Record<string, unknown> = typeof b.texts === "object" && b.texts ? b.texts : {};
  const saved: string[] = [];
  for (const [key, value] of Object.entries(texts)) {
    if (typeof value !== "string") continue;
    const clean = key.replace(/[^a-z0-9_]/gi, "");
    if (!clean || clean.length > 40) continue;
    const v = value.trim();
    if (!v) continue; // empty = back to default (handled by DELETE)
    await prisma.siteText.upsert({
      where: { key: clean },
      update: { value: v.slice(0, 400) },
      create: { key: clean, value: v.slice(0, 400) },
    });
    saved.push(clean);
  }
  if (saved.length === 0) return NextResponse.json({ ok: true, saved });
  return NextResponse.json({ ok: true, saved });
}

// Officer clears an override -> the code default wording takes over again.
export async function DELETE(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const key = (req.nextUrl.searchParams.get("key") || "").replace(/[^a-z0-9_]/gi, "");
  if (!key) return NextResponse.json({ error: "Missing key" }, { status: 400 });
  await prisma.siteText.deleteMany({ where: { key } });
  return NextResponse.json({ ok: true });
}
