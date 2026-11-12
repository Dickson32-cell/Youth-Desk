import { NextRequest, NextResponse, after } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { normalizeGhPhone, sendStatusSms, smsConfigured } from "@/lib/sms";

// PATCH a case: status / forwardedTo / add a note — one tidy endpoint
export async function PATCH(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  const id = Number(body.id);
  if (!Number.isInteger(id)) return NextResponse.json({ error: "Case id required" }, { status: 400 });
  const c = await prisma.case.findUnique({ where: { id } });
  if (!c) return NextResponse.json({ error: "Case not found" }, { status: 404 });

  const data: Record<string, string> = {};
  if (typeof body.status === "string" && ["NEW", "IN_PROGRESS", "RESOLVED", "FORWARDED"].includes(body.status))
    data.status = body.status;
  if (typeof body.forwardedTo === "string")
    data.forwardedTo = body.forwardedTo.trim().slice(0, 80);
  if (Object.keys(data).length) await prisma.case.update({ where: { id }, data });
  if (typeof body.note === "string" && body.note.trim()) {
    await prisma.caseNote.create({ data: { caseId: id, body: body.note.trim().slice(0, 1000), author: s.u } });
  }
  // Automatic client SMS on stage changes: Start Working (IN_PROGRESS) and
  // Mark Resolved (RESOLVED). Fires only when the status actually CHANGED and
  // the case has a valid phone on file. Deferred with after() so the reply is fast.
  const newStatus = data.status;
  const statusChanged = !!newStatus && newStatus !== c.status;
  const notify = statusChanged && (newStatus === "IN_PROGRESS" || newStatus === "RESOLVED");
  if (notify) {
    after(async () => {
      await sendStatusSms(c.caseNumber, c.phone, newStatus);
    });
  }
  const updated = await prisma.case.findUnique({ where: { id }, include: { notes: { orderBy: { id: "asc" } } } });
  return NextResponse.json({ ok: true, case: updated, smsQueued: !!notify && smsConfigured() && !!normalizeGhPhone(c.phone) });
}
