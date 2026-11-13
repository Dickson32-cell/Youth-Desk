import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { after } from "next/server";
import { normalizeGhPhone, sendProgramSms } from "@/lib/sms";

// PUBLIC: register a youth's interest for one open programme. No logins, no
// money. Phone optional - with a phone the youth gets ONE confirmation SMS.
export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id: raw } = await params;
  const id = parseInt(raw, 10);
  if (!id) return NextResponse.json({ error: "Bad programme" }, { status: 400 });
  const prog = await prisma.program.findUnique({ where: { id }, select: { id: true, title: true, status: true, deadline: true, venue: true } });
  if (!prog) return NextResponse.json({ error: "Programme not found" }, { status: 404 });
  if (prog.status !== "OPEN") return NextResponse.json({ error: "Registration for this programme is closed." }, { status: 409 });

  const f = await req.json().catch(() => null);
  if (!f) return NextResponse.json({ error: "Invalid body" }, { status: 400 });
  const name = String(f.name || "").trim().slice(0, 80);
  if (name.length < 2) return NextResponse.json({ error: "Enter your name." }, { status: 400 });
  const phoneRaw = String(f.phone || "").trim();
  const phone = phoneRaw ? normalizeGhPhone(phoneRaw) : null;
  if (phoneRaw && !phone) return NextResponse.json({ error: "That phone number is not a valid Ghana number." }, { status: 400 });
  const area = String(f.area || "").trim().slice(0, 60);
  const note = String(f.note || "").trim().slice(0, 300);

  try {
    const row = await prisma.registration.create({
      data: { programId: id, name, phone, area: area || null, note: note || null },
    });
    if (phone) {
      after(() => sendProgramSms(id, name, phone, prog.title, prog.deadline, prog.venue));
    }
    return NextResponse.json({ ok: true, name, smsQueued: !!phone, message: "You are registered. The desk will contact you with the next steps." });
  } catch (e: unknown) {
    // unique (programId, phone) => already registered with that number
    const msg = String((e as Error)?.message || "");
    if (msg.includes("P2002")) {
      return NextResponse.json({ ok: true, already: true, message: "This number is already registered for this programme." });
    }
    return NextResponse.json({ error: "Could not register now. Try again." }, { status: 500 });
  }
}
