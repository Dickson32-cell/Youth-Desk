import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

// Officer-typed departments, services and quick links.
// kind "link" carries the URL in the body field (validated + normalized here).
const KINDS = ["department", "service", "link"] as const;
function pickKind(v: unknown): string {
  return typeof v === "string" && (KINDS as readonly string[]).includes(v) ? v : "department";
}
function normalizeUrl(raw: string): string | null {
  const s = raw.trim().slice(0, 300);
  if (!s) return null;
  const withScheme = /^https?:\/\//i.test(s) ? s : "https://" + s;
  try {
    const u = new URL(withScheme);
    if (!u.hostname.includes(".") || u.hostname.length < 4) return null;
    return u.toString().replace(/\/$/, "") || null;
  } catch { return null; }
}
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const kind = pickKind(req.nextUrl.searchParams.get("kind"));
  const items = await prisma.siteItem.findMany({
    where: { kind },
    orderBy: { id: "asc" },
    select: { id: true, kind: true, title: true, body: true },
  });
  return NextResponse.json({ items });
}

export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const kind = pickKind(b.kind);
  const title = typeof b.title === "string" ? b.title.trim().slice(0, 80) : "";
  let body = typeof b.body === "string" ? b.body.trim().slice(0, 2000) : "";
  if (!title) return NextResponse.json({ error: "Type the name first" }, { status: 400 });
  if (kind === "link") {
    const url = normalizeUrl(body);
    if (!url) return NextResponse.json({ error: "Paste a valid link address (for example dovssu.gov.gh)" }, { status: 400 });
    body = url;
  }
  const item = await prisma.siteItem.create({ data: { kind, title, body } });
  return NextResponse.json({ ok: true, item: { id: item.id, kind, title: item.title, body: item.body } });
}

export async function PATCH(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const id = Number(b.id) || 0;
  const title = typeof b.title === "string" ? b.title.trim().slice(0, 80) : "";
  let body = typeof b.body === "string" ? b.body.trim().slice(0, 2000) : "";
  if (!id || !title) return NextResponse.json({ error: "Type the name first" }, { status: 400 });
  const existing = await prisma.siteItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // The kind stays whatever it was (a department edit cannot drift into a service).
  if (existing.kind === "link") {
    const url = normalizeUrl(body);
    if (!url) return NextResponse.json({ error: "Paste a valid link address (for example dovssu.gov.gh)" }, { status: 400 });
    body = url;
  }
  const item = await prisma.siteItem.update({ where: { id }, data: { title, body } });
  return NextResponse.json({ ok: true, item: { id: item.id, kind: item.kind, title: item.title, body: item.body } });
}

export async function DELETE(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = Number(req.nextUrl.searchParams.get("id")) || 0;
  const gone = await prisma.siteItem.deleteMany({ where: { id } });
  if (gone.count === 0) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
