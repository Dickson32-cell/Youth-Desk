import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { sendProgramSms } from "@/lib/sms";
import { normalizeGhPhone } from "@/lib/sms";

// Officer registers a WALK-IN youth onto a published programme at the desk.
// Same ledger rules as the public route: unique (program, phone) once, plus
// the same confirmation SMS; the row is marked walkin=true.
export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const f = await req.json().catch(() => null);
  if (!f?.id) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const id = parseInt(String(f.id), 10);
  const name = String(f.name || "").trim().slice(0, 80);
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });
  const phone = f.phone ? normalizeGhPhone(String(f.phone)) : null;
  if (f.phone && !phone) return NextResponse.json({ error: "That phone number is not a valid Ghana number" }, { status: 400 });

  const prog = await prisma.program.findUnique({ where: { id }, select: { id: true, title: true, status: true, deadline: true, venue: true } });
  if (!prog) return NextResponse.json({ error: "Programme not found" }, { status: 404 });
  if (prog.status !== "OPEN") return NextResponse.json({ error: "Reopen the programme first" }, { status: 409 });

  if (phone) {
    const dupe = await prisma.registration.findFirst({ where: { programId: id, phone } });
    if (dupe) return NextResponse.json({ error: `${name} is already on this programme.` }, { status: 409 });
  }

  const reg = await prisma.registration.create({ data: { programId: id, name, phone, area: f.area ? String(f.area).trim().slice(0, 60) : null, note: f.note ? String(f.note).trim().slice(0, 500) : null, walkin: true } });

  // same confirmation SMS the youth would get online
  let smsQueued = false;
  if (phone) {
    void sendProgramSms(id, name, phone, prog.title, prog.deadline, prog.venue);
    smsQueued = true;
  }

  return NextResponse.json({ ok: true, walkin: true, registration: { id: reg.id, name: reg.name, phone: reg.phone }, smsQueued });
}

// list walk-in + online registrants for one programme (officer drawer)
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const id = parseInt(req.nextUrl.searchParams.get("id") || "", 10);
  if (!id) return NextResponse.json({ error: "Bad id" }, { status: 400 });
  const rows = await prisma.registration.findMany({
    where: { programId: id },
    orderBy: { id: "desc" },
    select: { id: true, name: true, phone: true, area: true, note: true, walkin: true, createdAt: true, reminderSentAt: true },
  });
  return NextResponse.json({ ok: true, rows });
}
