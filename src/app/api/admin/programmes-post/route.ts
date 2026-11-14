import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

// Officer management of PUBLIC programme posts (open for youth registration).
// GET ?registrants=<programId> : the sign-up list for that programme
// GET  : all posts newest-first with registration counts
// POST : create a public programme post
// PATCH: { id, action: "close" | "reopen" }
// DELETE ?id=
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // ?full=1 : every published programme WITH its registered individuals (print PDF source)
  if (req.nextUrl.searchParams.get("full") === "1") {
    const rows = await prisma.program.findMany({
      orderBy: { id: "desc" },
      select: { id: true, title: true, description: true, category: true, deadline: true, venue: true, seats: true, status: true, meetingDate: true, interventionId: true, registrations: { orderBy: { id: "asc" }, select: { id: true, name: true, phone: true, area: true, note: true, walkin: true, createdAt: true } }, _count: { select: { registrations: true } } },
    });
    return NextResponse.json({
      ok: true,
      rows: rows.map((r) => ({
        id: r.id, title: r.title, description: r.description, category: r.category,
        deadline: r.deadline, venue: r.venue, seats: r.seats, status: r.status,
        meetingDate: r.meetingDate,
      interventionId: r.interventionId,
      registrations: r.registrations.map((g) => ({ id: g.id, name: g.name, phone: g.phone, area: g.area, note: g.note, walkin: g.walkin, createdAt: g.createdAt })),
      })),
    });
  }

  const want = parseInt(req.nextUrl.searchParams.get("registrants") || "", 10);
  if (want) {
    const program = await prisma.program.findUnique({ where: { id: want }, select: { id: true, title: true } });
    if (!program) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const rows = await prisma.registration.findMany({ where: { programId: want }, orderBy: { id: "desc" }, select: { id: true, name: true, phone: true, area: true, note: true, createdAt: true, reminderSentAt: true } });
    return NextResponse.json({ ok: true, program, rows });
  }

  const [rows, remindedByProgram] = await Promise.all([
    prisma.program.findMany({
      orderBy: { id: "desc" },
      include: { _count: { select: { registrations: true } } },
    }),
    prisma.registration.groupBy({ by: ["programId"], where: { reminderSentAt: { not: null } }, _count: { _all: true } }),
  ]);
  const remindedMap = new Map(remindedByProgram.map((g) => [g.programId, g._count._all]));
  return NextResponse.json({
    ok: true,
    rows: rows.map((r) => ({
      id: r.id, title: r.title, description: r.description, category: r.category,
      deadline: r.deadline, venue: r.venue, seats: r.seats, status: r.status,
      meetingDate: r.meetingDate,
      postedBy: r.postedBy, createdAt: r.createdAt,
      registrations: r._count.registrations,
      reminded: remindedMap.get(r.id) || 0,
    })),
  });
}

export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const f = await req.json().catch(() => null);
  if (!f) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const title = String(f.title || "").trim().slice(0, 120);
  const description = String(f.description || "").trim().slice(0, 4000);
  if (!title || !description) return NextResponse.json({ error: "Title and description are required" }, { status: 400 });
  const category = ["TRAINING", "APPRENTICESHIP", "INTERNSHIP", "MENTORSHIP", "GRANT", "MARKET", "OTHER"].includes(String(f.category)) ? String(f.category) : String(f.category || "").trim().slice(0, 24).toUpperCase() || "TRAINING";
  const seats = f.seats === undefined || f.seats === null || f.seats === "" ? null : Math.max(0, parseInt(String(f.seats), 10) || 0);
  const row = await prisma.program.create({
    data: {
      title, description, category,
      deadline: f.deadline ? String(f.deadline).slice(0, 60) : null,
      venue: f.venue ? String(f.venue).trim().slice(0, 160) : null,
      meetingDate: f.meetingDate ? String(f.meetingDate).trim().slice(0, 80) : null,
      seats, status: "OPEN", postedBy: s.u,
    },
  });
  return NextResponse.json({ ok: true, row });
}

export async function PATCH(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const f = await req.json().catch(() => null);
  if (!f?.id || !["close", "reopen"].includes(f.action)) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const row = await prisma.program.update({
    where: { id: parseInt(String(f.id), 10) },
    data: { status: f.action === "close" ? "CLOSED" : "OPEN" },
  });
  return NextResponse.json({ ok: true, row: { id: row.id, status: row.status } });
}

export async function DELETE(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = parseInt(req.nextUrl.searchParams.get("id") || "", 10);
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const gone = await prisma.program.deleteMany({ where: { id } });
  if (!gone.count) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
