
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

// Municipality interventions / programmes the desk coordinates.
// GET  ?from=&to= optional ISO dates (inclusive) for report-pack windows
// POST { date, department, title, type, target, reached, budget?, note?, postToWebsite?, venue?, deadline?, meetingDate? }
//      postToWebsite=true ALSO opens a public sign-up post linked to this row.
// PATCH { id, action: "post" | "unpost" } - publish/remove the public programme later
// DELETE ?id= (removes the row AND its linked public programme, if any)
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const from = req.nextUrl.searchParams.get("from");
  const to = req.nextUrl.searchParams.get("to");
  const where: { date?: { gte?: Date; lte?: Date } } = {};
  if (from && to) where.date = { gte: new Date(from + "T00:00:00.000Z"), lte: new Date(to + "T23:59:59.999Z") };

  const rows = await prisma.intervention.findMany({ where, orderBy: [{ date: "desc" }, { id: "desc" }], include: { programs: { select: { id: true, title: true, status: true, venue: true, deadline: true, meetingDate: true, _count: { select: { registrations: true } } } } } });

  // "Youth reached" for a posted programme = every youth actually registered,
  // walk-in AND online combined (live count from the sign-ups). Rows without a
  // sign-up post keep the officer's typed attendance figure.
  const liveOf = (r: (typeof rows)[number]) => (r.programs && r.programs.length ? r.programs.reduce((n, x) => n + (x._count?.registrations || 0), 0) : null);
  const enriched = rows.map((r) => {
    const reachedCalc = liveOf(r) ?? r.reached;
    const coverage = r.target && r.target > 0 ? Math.round((reachedCalc / r.target) * 100) : null;
    return { ...r, reachedCalc, liveReached: liveOf(r), coverage };
  });
  const summary = {
    items: enriched.length,
    target: enriched.reduce((n, r) => n + (r.target || 0), 0),
    reached: enriched.reduce((n, r) => n + (r.reachedCalc || 0), 0),
    budget: enriched.reduce((n, r) => n + (r.budget ? Number(r.budget) : 0), 0),
    coverage: (() => {
      const t = enriched.reduce((n, r) => n + (r.target || 0), 0);
      if (!t) return null;
      return Math.round((enriched.reduce((n, r) => n + (r.reachedCalc || 0), 0) / t) * 100);
    })(),
  };
  const byDept = new Map<string, { target: number; reached: number; items: number }>();
  for (const r of enriched) {
    const d = byDept.get(r.department) || { target: 0, reached: 0, items: 0 };
    d.target += r.target || 0; d.reached += r.reachedCalc || 0; d.items += 1;
    byDept.set(r.department, d);
  }
  return NextResponse.json({ ok: true, rows: enriched, summary, byDept: [...byDept.entries()].map(([department, v]) => ({ department, ...v })) });
}

export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const f = await req.json().catch(() => null);
  if (!f) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const department = String(f.department || "").trim().slice(0, 80);
  const title = String(f.title || "").trim().slice(0, 120);
  // fixed types win; anything else = the officer's typed category (<=24 chars)
  const type = ["TRAINING", "APPRENTICESHIP", "INTERNSHIP", "MENTORSHIP", "GRANT", "MARKET", "OTHER"].includes(String(f.type)) ? String(f.type) : String(f.type || "").trim().slice(0, 24).toUpperCase();
  if (!department || !title) return NextResponse.json({ error: "Department and title are required" }, { status: 400 });
  if (!f.date) return NextResponse.json({ error: "Date is required" }, { status: 400 });
  const d = new Date(f.date);
  if (isNaN(d.getTime())) return NextResponse.json({ error: "Bad date" }, { status: 400 });
  const target = Math.max(0, Math.min(1_000_000, parseInt(String(f.target || 0), 10) || 0));
  const reached = Math.max(0, Math.min(1_000_000, parseInt(String(f.reached || 0), 10) || 0));
  const budget = f.budget === undefined || f.budget === null || f.budget === "" ? null : Number(f.budget);
  const venue = f.venue ? String(f.venue).trim().slice(0, 160) : null;

  const row = await prisma.intervention.create({
    data: { date: d, department, title, type, target, reached, budget: budget && isFinite(budget) ? budget : null, note: f.note ? String(f.note).slice(0, 2000) : null, officer: s.u },
  });

  // the checkbox: the intervention ALSO lives on the main website for sign-up
  let post: { id: number } | null = null;
  if (f.postToWebsite) {
    const prog = await prisma.program.create({
      data: {
        title,
        description: [f.note ? String(f.note).slice(0, 1000) : "", "Led by the " + department + " (Youth Desk NJSMA). Register here - the desk officer will contact you with the next steps."].filter(Boolean).join(" "),
        category: ["TRAINING", "APPRENTICESHIP", "INTERNSHIP", "MENTORSHIP", "GRANT", "MARKET", "OTHER"].includes(type) ? type : "OTHER",
        deadline: f.deadline ? String(f.deadline).trim().slice(0, 60) : null,
        venue,
        meetingDate: f.meetingDate ? String(f.meetingDate).trim().slice(0, 80) : null,
        seats: target > 0 ? target : null,
        status: "OPEN",
        postedBy: s.u,
        interventionId: row.id,
      },
    });
    post = { id: prog.id };
  }

  return NextResponse.json({ ok: true, row, post });
}

// publish (or remove) the public sign-up programme for an EXISTING row
export async function PATCH(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const f = await req.json().catch(() => null);
  const id = parseInt(String(f?.id || ""), 10);
  if (!id) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const row = await prisma.intervention.findUnique({ where: { id }, include: { programs: { select: { id: true } } } });
  if (!row) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (f.action === "unpost") {
    await prisma.program.deleteMany({ where: { interventionId: id } });
    return NextResponse.json({ ok: true, posted: false });
  }
  if (f.action === "post") {
    if (row.programs.length) return NextResponse.json({ ok: true, posted: true, postId: row.programs[0].id });
    const prog = await prisma.program.create({
      data: {
        title: row.title,
        description: [row.note ? row.note.slice(0, 1000) : "", "Led by the " + row.department + " (Youth Desk NJSMA). Register here - the desk officer will contact you with the next steps."].filter(Boolean).join(" "),
        category: ["TRAINING", "APPRENTICESHIP", "INTERNSHIP", "MENTORSHIP", "GRANT", "MARKET", "OTHER"].includes(row.type) ? row.type : "OTHER",
        venue: f.venue ? String(f.venue).trim().slice(0, 160) : null,
        meetingDate: f.meetingDate ? String(f.meetingDate).trim().slice(0, 80) : null,
        seats: row.target > 0 ? row.target : null,
        status: "OPEN",
        postedBy: s.u,
        interventionId: row.id,
      },
    });
    return NextResponse.json({ ok: true, posted: true, postId: prog.id });
  }
  return NextResponse.json({ error: "Unknown action" }, { status: 400 });
}

export async function DELETE(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = parseInt(req.nextUrl.searchParams.get("id") || "", 10);
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  // the linked public programme (and its registrations) goes with the row
  await prisma.program.deleteMany({ where: { interventionId: id } });
  const gone = await prisma.intervention.deleteMany({ where: { id } });
  if (!gone.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
