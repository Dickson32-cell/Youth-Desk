import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

// Officer-typed departments and services shown on the public About page.
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const kind = req.nextUrl.searchParams.get("kind") === "service" ? "service" : "department";
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
  const kind = b.kind === "service" ? "service" : "department";
  const title = typeof b.title === "string" ? b.title.trim().slice(0, 80) : "";
  const body = typeof b.body === "string" ? b.body.trim().slice(0, 300) : "";
  if (!title) return NextResponse.json({ error: "Type the name first" }, { status: 400 });
  const item = await prisma.siteItem.create({ data: { kind, title, body } });
  return NextResponse.json({ ok: true, item: { id: item.id, kind, title: item.title, body: item.body } });
}

export async function PATCH(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const b = await req.json().catch(() => ({}));
  const id = Number(b.id) || 0;
  const title = typeof b.title === "string" ? b.title.trim().slice(0, 80) : "";
  const body = typeof b.body === "string" ? b.body.trim().slice(0, 300) : "";
  if (!id || !title) return NextResponse.json({ error: "Type the name first" }, { status: 400 });
  const existing = await prisma.siteItem.findUnique({ where: { id } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });
  // The kind stays whatever it was (a department edit cannot drift into a service).
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
