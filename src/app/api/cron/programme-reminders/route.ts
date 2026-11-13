import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { normalizeGhPhone } from "@/lib/sms";

// AUTOMATED meeting reminders (Vercel Cron calls this daily, CRON_SECRET
// guarded): every OPEN programme whose meetingDate is TOMORROW reminds all its
// registrants who have not been reminded yet, with the meeting venue.
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  const auth = req.headers.get("authorization") || "";
  if (!secret || auth !== `Bearer ${secret}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const t0 = new Date();
  const t1 = new Date(t0.getTime() + 36 * 3600 * 1000); // send window: tomorrow-ish (30h-36h)
  const t0s = new Date(t0.getTime() + 30 * 3600 * 1000);
  const due = await prisma.program.findMany({
    where: { status: "OPEN", meetingDate: { not: null } },
    select: { id: true, title: true, venue: true, meetingDate: true },
  });

  const results: { programme: string; meeting: string; sent: number }[] = [];
  for (const prog of due) {
    // parse the officer-typed meetingDate (accepts e.g. "20 Nov 2026")
    const md = new Date(prog.meetingDate || "");
    if (isNaN(md.getTime())) continue;
    if (md < t0s || md > t1) continue; // only programmes meeting TOMORROW

    const targets = await prisma.registration.findMany({
      where: { programId: prog.id, reminderSentAt: null, phone: { not: null } },
      select: { id: true, phone: true },
      take: 300,
    });
    let sent = 0;
    for (const g of targets) {
      const to = normalizeGhPhone(g.phone);
      try {
        const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
          method: "POST",
          headers: { "api-key": String(process.env.ARKESEL_API_KEY), "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 YouthDesk/1.0" },
          body: JSON.stringify({
            sender: process.env.ARKESEL_SENDER || "YOUTHDSK",
            message: `Youth Desk: Reminder. "${prog.title}" holds on ${prog.meetingDate}${prog.venue ? ` at ${prog.venue}` : ""}. Please come on time. - Youth Desk NJSMA`,
            recipients: [to],
          }),
          signal: AbortSignal.timeout(20000),
        });
        const j = await res.json().catch(() => ({}));
        await prisma.smsLog.create({
          data: { kind: "PROGRAM_REMINDER", caseNumber: "PGM-" + prog.id, phone: to || String(g.phone).slice(0, 20), status: res.ok ? "SENT" : "FAILED", providerRef: JSON.stringify(j).slice(0, 220), error: res.ok ? null : `HTTP ${res.status}` },
        }).catch(() => {});
        if (res.ok) sent += 1;
      } catch {
        await prisma.smsLog.create({ data: { kind: "PROGRAM_REMINDER", caseNumber: "PGM-" + prog.id, phone: normalizeGhPhone(g.phone) || String(g.phone), status: "FAILED", error: "network" } }).catch(() => {});
      }
      await prisma.registration.update({ where: { id: g.id }, data: { reminderSentAt: new Date() } });
    }
    results.push({ programme: prog.title, meeting: prog.meetingDate || "", sent });
  }
  return NextResponse.json({ ok: true, checked: due.length, results, ranAt: t0.toISOString() });
}
