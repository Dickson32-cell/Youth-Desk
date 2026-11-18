import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";
import { normalizeGhPhone, programmeAlertSmsText, smsConfigured } from "@/lib/sms";

// Web link for SMS alerts. Override lives in the officer-editable SiteText key
// sms_web_link (Content page); falls back to env, then the current URL.
export async function resolveAlertLink(): Promise<string> {
  const t = await prisma.siteText.findUnique({ where: { key: "sms_web_link" }, select: { value: true } });
  if (t && t.value.trim()) return t.value.trim().slice(0, 120);
  return process.env.YOUTHDESK_WEB_LINK || process.env.NEXT_PUBLIC_APP_URL || "https://youth-desk-abdul-rashid-dicksons-projects.vercel.app";
}

// GET ?id= : how many registered youth still need the alert for that programme
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const want = parseInt(req.nextUrl.searchParams.get("id") || "", 10);
  if (want) {
    const [withPhone, done] = await Promise.all([
      prisma.youth.count({ where: { phone: { not: null } } }),
      prisma.programmeAlert.count({ where: { programmeId: want } }),
    ]);
    return NextResponse.json({ ok: true, due: Math.max(0, withPhone - done) });
  }
  return NextResponse.json({ error: "Bad request" }, { status: 400 });
}

// POST { id } : send the alert to every registered youth with a phone who has
// not received it for THIS programme yet (never-twice). Batched 40 per press;
// press again for the next batch (mark-guided resume, duplicates impossible).
export async function POST(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const f = await req.json().catch(() => null);
  const id = parseInt(String(f?.id || ""), 10);
  if (!id) return NextResponse.json({ error: "Bad request" }, { status: 400 });
  const prog = await prisma.program.findUnique({ where: { id }, select: { id: true, title: true } });
  if (!prog) return NextResponse.json({ error: "Programme not found" }, { status: 404 });
  if (!smsConfigured()) return NextResponse.json({ error: "SMS is not configured on this deployment yet." }, { status: 409 });

  const done = await prisma.programmeAlert.findMany({ where: { programmeId: id }, select: { youthId: true } });
  const doneSet = new Set(done.map((d) => d.youthId));
  const youths = await prisma.youth.findMany({
    where: { phone: { not: null } },
    orderBy: { id: "asc" },
    take: 200,
    select: { id: true, serial: true, name: true, phone: true },
  });
  const targets = youths.filter((y) => !doneSet.has(y.id)).slice(0, 40);

  const link = await resolveAlertLink();
  let sent = 0, failed = 0;
  for (const y of targets) {
    const to = normalizeGhPhone(y.phone);
    let okSend = false;
    if (to) {
      try {
        const res = await fetch("https://sms.arkesel.com/api/v2/sms/send", {
          method: "POST",
          headers: { "api-key": String(process.env.ARKESEL_API_KEY), "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 YouthDesk/1.0" },
          body: JSON.stringify({ sender: process.env.ARKESEL_SENDER || "YOUTHDSK", message: programmeAlertSmsText(prog.title, link), recipients: [to] }),
          signal: AbortSignal.timeout(20000),
        });
        const j = await res.json().catch(() => ({}));
        okSend = res.ok;
        await prisma.smsLog.create({
          data: { kind: "PROGRAM_ALERT", caseNumber: "PGM-" + id, phone: to, status: okSend ? "SENT" : "FAILED",
            providerRef: JSON.stringify(j).slice(0, 220), error: okSend ? null : `HTTP ${res.status}` },
        }).catch(() => {});
      } catch {
        await prisma.smsLog.create({ data: { kind: "PROGRAM_ALERT", caseNumber: "PGM-" + id, phone: String(y.phone).slice(0, 20), status: "FAILED", error: "network" } }).catch(() => {});
      }
    } else {
      await prisma.smsLog.create({ data: { kind: "PROGRAM_ALERT", caseNumber: "PGM-" + id, phone: String(y.phone || "").slice(0, 20), status: "SKIPPED", error: "invalid phone" } }).catch(() => {});
    }
    if (okSend) {
      sent += 1;
      await prisma.programmeAlert.create({ data: { programmeId: id, youthId: y.id } }).catch(() => {});
    } else {
      failed += 1;
    }
  }
  const totalPhone = await prisma.youth.count({ where: { phone: { not: null } } });
  const alerted = await prisma.programmeAlert.count({ where: { programmeId: id } });
  return NextResponse.json({
    ok: true, sent, failed, targets: targets.length,
    remaining: Math.max(0, totalPhone - alerted),
    link, title: prog.title,
  });
}
