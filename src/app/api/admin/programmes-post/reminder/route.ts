import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { normalizeGhPhone, sendProgramSms, getSmsLink } from "@/lib/sms";

// Meeting reminder for a published programme: sends ONE reminder SMS to every
// registrant who has not received it yet (never-twice via reminderSentAt).
// Body: { id, meetingDate?, venue? } - meetingDate/venue optional updates.
export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const f = await req.json().catch(() => null);
  if (!f?.id) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const id = parseInt(String(f.id), 10);

  const prog = await prisma.program.findUnique({ where: { id }, select: { id: true, title: true, deadline: true, venue: true, meetingDate: true } });
  if (!prog) return NextResponse.json({ error: "Programme not found" }, { status: 404 });

  const updates: { meetingDate?: string; venue?: string } = {};
  if (f.meetingDate) updates.meetingDate = String(f.meetingDate).trim().slice(0, 80);
  if (f.venue) updates.venue = String(f.venue).trim().slice(0, 160);
  if (Object.keys(updates).length) {
    await prisma.program.update({ where: { id }, data: updates });
  }
  const current = Object.keys(updates).length ? await prisma.program.findUnique({ where: { id }, select: { title: true, deadline: true, venue: true, meetingDate: true } }) : prog;

  if (f.reset) {
    // explicit officer re-reminder (meeting moved / youth who did not come):
    // clear the once-mark so EVERY registrant gets this SMS again
    await prisma.registration.updateMany({ where: { programId: id }, data: { reminderSentAt: null } });
  }
  const targets = await prisma.registration.findMany({
    where: { programId: id, reminderSentAt: null, phone: { not: null }, OR: [{ phone: { not: "" } }] },
    select: { id: true, name: true, phone: true },
    take: 300,
  });

  // fire each reminder (fire-and-forget pattern is for after(); here we await
  // so the officer gets honest counts - capped at 300 per press, batched)
  let sent = 0;
  const link = await getSmsLink();
  const title = current?.title || "";
  for (const g of targets) {
    const to = normalizeGhPhone(g.phone);
    try {
      const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
        method: "POST",
        headers: { "api-key": String(process.env.ARKESEL_API_KEY), "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 YouthDesk/1.0" },
        body: JSON.stringify({
          sender: process.env.ARKESEL_SENDER || "YOUTHDSK",
          message: `Youth Desk: Reminder. "${title}"${current?.meetingDate ? ` holds on ${current.meetingDate}` : ""}${current?.venue ? ` at ${current.venue}` : ""}. Details: ${link} Please come on time. - Youth Desk NJSMA`,
          recipients: [to],
        }),
        signal: AbortSignal.timeout(20000),
      });
      const j = await res.json().catch(() => ({}));
      await prisma.smsLog.create({
        data: {
          kind: "PROGRAM_REMINDER", caseNumber: "PGM-" + id, phone: to || String(g.phone).slice(0, 20),
          status: res.ok ? "SENT" : "FAILED",
          providerRef: JSON.stringify(j).slice(0, 220),
          error: res.ok ? null : `HTTP ${res.status}`,
        },
      }).catch(() => {});
      if (res.ok) sent += 1;
    } catch {
      await prisma.smsLog.create({ data: { kind: "PROGRAM_REMINDER", caseNumber: "PGM-" + id, phone: normalizeGhPhone(g.phone) || String(g.phone), status: "FAILED", error: "network" } }).catch(() => {});
    }
    await prisma.registration.update({ where: { id: g.id }, data: { reminderSentAt: new Date() } });
  }

  return NextResponse.json({ ok: true, sent, targets: targets.length, remaining: (await prisma.registration.count({ where: { programId: id, reminderSentAt: null, phone: { not: null } } })) });
}
