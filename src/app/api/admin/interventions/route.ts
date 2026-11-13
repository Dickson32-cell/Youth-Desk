import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

// Municipality interventions / programmes the desk coordinates.
// GET  ?from=&to= optional ISO dates (inclusive) for report-pack windows
// POST { date, department, title, type, target, reached, budget?, note? }
// DELETE ?id=
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const where: { date?: { gte?: Date; lte?: Date } } = {};
  if (from && to) where.date = { gte: new Date(from + "T00:00:00.000Z"), lte: new Date(to + "T23:59:59.999Z") };

  const rows = await prisma.intervention.findMany({ where, orderBy: [{ date: "desc" }, { id: "desc" }] });
  const summary = {
    items: rows.length,
    target: rows.reduce((n, r) => n + (r.target || 0), 0),
    reached: rows.reduce((n, r) => n + (r.reached || 0), 0),
    budget: rows.reduce((n, r) => n + (r.budget ? Number(r.budget) : 0), 0),
  };
  const byDept = new Map<string, { target: number; reached: number; items: number }>();
  for (const r of rows) {
    const d = byDept.get(r.department) || { target: 0, reached: 0, items: 0 };
    d.target += r.target || 0; d.reached += r.reached || 0; d.items += 1;
    byDept.set(r.department, d);
  }
  return NextResponse.json({ ok: true, rows, summary, byDept: [...byDept.entries()].map(([department, v]) => ({ department, ...v })) });
}

export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const f = await req.json().catch(() => null);
  if (!f) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const department = String(f.department || "").trim().slice(0, 80);
  const title = String(f.title || "").trim().slice(0, 120);
  const type = ["TRAINING", "APPRENTICESHIP", "INTERNSHIP", "MENTORSHIP", "GRANT", "MARKET", "OTHER"].includes(String(f.type)) ? String(f.type) : "OTHER";
  if (!department || !title) return NextResponse.json({ error: "Department and title are required" }, { status: 400 });
  if (!f.date) return NextResponse.json({ error: "Date is required" }, { status: 400 });
  const d = new Date(f.date);
  if (isNaN(d.getTime())) return NextResponse.json({ error: "Bad date" }, { status: 400 });
  const target = Math.max(0, Math.min(1_000_000, parseInt(String(f.target || 0), 10) || 0));
  const reached = Math.max(0, Math.min(1_000_000, parseInt(String(f.reached || 0), 10) || 0));
  const budget = f.budget === undefined || f.budget === null || f.budget === "" ? null : Number(f.budget);

  const row = await prisma.intervention.create({
    data: { date: d, department, title, type, target, reached, budget: budget && isFinite(budget) ? budget : null, note: f.note ? String(f.note).slice(0, 2000) : null, officer: s.u },
  });
  return NextResponse.json({ ok: true, row });
}

export async function DELETE(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = parseInt(req.nextUrl.searchParams.get("id") || "", 10);
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const gone = await prisma.intervention.deleteMany({ where: { id } });
  if (!gone.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
