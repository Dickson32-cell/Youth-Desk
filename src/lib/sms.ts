// SMS: every accepted report with a phone number gets ONE fixed confirmation
// SMS (case number + how to track). Provider = Arkesel v2 (same as the council
// register + EHGA). Feature is latent until YOUTHDESK_SMS_ENABLED=1 +
// ARKESEL_API_KEY are set - then it goes live with zero code changes.
// Every attempt is ledgered in SmsLog. Provider notes: Arkesel sits behind a
// CDN that fingerprints non-browser clients -> always send a browser-ish
// User-Agent; endpoint is sms.arkesel.com (NOT api.arkesel.com).
import { prisma } from "@/lib/db";

const ENDPOINT = "https://sms.arkesel.com/api/v2/sms/send";
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 YouthDesk/1.0";

export function smsConfigured(): boolean {
  return process.env.YOUTHDESK_SMS_ENABLED === "1" && !!process.env.ARKESEL_API_KEY;
}

// +233 national numbers only (the desk only texts Ghana lines).
export function normalizeGhPhone(raw: string | null | undefined): string | null {
  const cleaned = String(raw || "").replace(/[^\d]/g, "");
  let national = "";
  if (cleaned.startsWith("233") && cleaned.length === 12) national = cleaned.slice(3);
  else if (cleaned.startsWith("0") && cleaned.length === 10) national = cleaned.slice(1);
  else if (cleaned.length === 9) national = cleaned;
  else return null;
  if (!/^2\d{8}$|^5\d{8}$/.test(national)) return null; // 24/5x prefixes
  return "+233" + national;
}

// The web link that rides EVERY outgoing SMS. One editable link: when the
// custom domain is bought the officer types it once (Content page) and every
// SMS template - confirmations, updates, reminders, alerts - follows it.
export async function getSmsLink(): Promise<string> {
  const t = await prisma.siteText.findUnique({ where: { key: "sms_web_link" }, select: { value: true } });
  if (t && t.value.trim()) return t.value.trim().slice(0, 120);
  return process.env.YOUTHDESK_WEB_LINK || process.env.NEXT_PUBLIC_APP_URL || "https://youth-desk-abdul-rashid-dicksons-projects.vercel.app";
}

// The ONLY SMS the system sends of this kind (fixed template, edit here).
// Confidentiality: every case gets a private tracking KEY - the number alone
// no longer opens the case, so a leaked/guessed number reveals nothing.
export function caseSmsText(caseNumber: string, trackKey: string): string {
  const t = `Youth Desk: Case ${caseNumber} received. Your tracking key: ${trackKey}. Open the Youth Desk website, choose Track and enter the case number AND this key.`;
  return t.length <= 320 ? t : t.slice(0, 320);
}

// Programme-registration confirmation (fixed template): youth who registered
// online for an open programme get the programme title AND its details
// (closing date, venue) so the SMS itself carries what they need to know.
export function programSmsText(programId: number, name: string, title: string, deadline?: string | null, venue?: string | null): string {
  const first = String(name || "").trim().split(/\s+/)[0] || "there";
  let parts = [`Youth Desk: ${first}, you have registered for "${title}".`];
  if (deadline) parts.push(`Register by ${deadline}.`);
  if (venue) parts.push(`Venue: ${venue}.`);
  parts.push("The desk officer will contact you with the next steps.");
  const t = parts.join(" ");
  return t.length <= 320 ? t : t.slice(0, 320);
}

// Online youth self-registration confirmation (fixed template): carries the
// register serial so the youth can quote it at the desk.
export function youthRegisterSmsText(serial: string): string {
  const t = `Youth Desk: Your registration at the Youth Desk is confirmed. Register No. ${serial}. Keep it. The office will contact you on this line.`;
  return t.length <= 160 ? t : t.slice(0, 160);
}

// Stage-update SMS templates (fixed, one per officer action):
export function statusSmsText(caseNumber: string, status: "IN_PROGRESS" | "RESOLVED"): string {
  if (status === "RESOLVED") {
    return `Youth Desk: Update on case ${caseNumber}: your case has been resolved. Thank you for using the Youth Desk.`;
  }
  return `Youth Desk: Update on case ${caseNumber}: the officer has started working on your case. Track it any time on the website.`;
}

export async function sendStatusSms(caseNumber: string, phone: string | null, status: "IN_PROGRESS" | "RESOLVED"): Promise<void> {
  const link = await getSmsLink();
  const to = normalizeGhPhone(phone);
  const base = { kind: "STATUS_" + status, caseNumber, phone: to || String(phone ?? "").slice(0, 20) };
  if (!to) {
    await prisma.smsLog.create({ data: { ...base, status: "SKIPPED", error: "no phone on file" } }).catch(() => {});
    return;
  }
  if (!smsConfigured()) {
    await prisma.smsLog.create({ data: { ...base, status: "SKIPPED", error: "not configured" } }).catch(() => {});
    return;
  }
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "api-key": String(process.env.ARKESEL_API_KEY), "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({
        sender: process.env.ARKESEL_SENDER || "YOUTHDSK",
        message: status === "RESOLVED"
          ? `Youth Desk: Update on case ${caseNumber}: your case has been resolved. Thank you for using the Youth Desk. See your outcome on the website: ${link}`
          : `Youth Desk: Update on case ${caseNumber}: the officer has started working on your case. Track it here: ${link}`,
        recipients: [to],
      }),
      signal: AbortSignal.timeout(20000),
    });
    const j = await res.json().catch(() => ({}));
    await prisma.smsLog.create({
      data: {
        ...base,
        status: res.ok ? "SENT" : "FAILED",
        providerRef: JSON.stringify(j).slice(0, 220),
        error: res.ok ? null : `HTTP ${res.status}`,
      },
    }).catch(() => {});
  } catch (e) {
    await prisma.smsLog.create({
      data: { ...base, status: "FAILED", error: String(e).slice(0, 200) },
    }).catch(() => {});
  }
}

export async function sendCaseSms(caseNumber: string, phone: string, trackKey: string): Promise<void> {
  const link = await getSmsLink();
  const to = normalizeGhPhone(phone);
  const base = { kind: "CASE_CONFIRM", caseNumber, phone: to || String(phone ?? "").slice(0, 20) };
  if (!to) {
    await prisma.smsLog.create({ data: { ...base, status: "SKIPPED", error: "invalid phone" } }).catch(() => {});
    return;
  }
  if (!smsConfigured()) {
    await prisma.smsLog.create({ data: { ...base, status: "SKIPPED", error: "not configured" } }).catch(() => {});
    return;
  }
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "api-key": String(process.env.ARKESEL_API_KEY), "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({
        sender: process.env.ARKESEL_SENDER || "YOUTHDSK",
        message: `Youth Desk: Case ${caseNumber} received. Your tracking key: ${trackKey}. Track it here: ${link}. Keep this key private.`, 
        recipients: [to],
      }),
      signal: AbortSignal.timeout(20000),
    });
    const j = await res.json().catch(() => ({}));
    await prisma.smsLog.create({
      data: {
        ...base,
        status: res.ok ? "SENT" : "FAILED",
        providerRef: JSON.stringify(j).slice(0, 220),
        error: res.ok ? null : `HTTP ${res.status}`,
      },
    }).catch(() => {});
  } catch (e) {
    await prisma.smsLog.create({
      data: { ...base, status: "FAILED", error: String(e).slice(0, 200) },
    }).catch(() => {});
  }
}

// New-programme SMS alert to REGISTERED youth (walk-in + online) - the officer
// presses "Alert registered youth" on a posted programme. The web link comes
// from the officer-editable SiteText override sms_web_link (falls back to env).
export function programmeAlertSmsText(title: string, link: string): string {
  const t = `Youth Desk NJSMA: New programme "${title}" is on our website. See details and register: ${link} Or visit the desk office.`;
  return t.length <= 320 ? t : t.slice(0, 320);
}

// Fire-and-forget programme confirmation SMS (deferred via after()).
export async function sendProgramSms(programId: number, name: string, phone: string, title: string, deadline?: string | null, venue?: string | null): Promise<void> {
  const link = await getSmsLink();
  const to = normalizeGhPhone(phone);
  const base = { kind: "PROGRAM_CONFIRM", caseNumber: "PGM-" + programId, phone: to || String(phone ?? "").slice(0, 20) };
  if (!to) {
    await prisma.smsLog.create({ data: { ...base, status: "SKIPPED", error: "invalid phone" } }).catch(() => {});
    return;
  }
  if (!smsConfigured()) {
    await prisma.smsLog.create({ data: { ...base, status: "SKIPPED", error: "not configured" } }).catch(() => {});
    return;
  }
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "api-key": String(process.env.ARKESEL_API_KEY), "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ sender: process.env.ARKESEL_SENDER || "YOUTHDSK", message: programSmsText(programId, name, title, deadline, venue) + ` Details on our website: ${link}`, recipients: [to] }),
      signal: AbortSignal.timeout(20000),
    });
    const j = await res.json().catch(() => ({}));
    await prisma.smsLog.create({
      data: { ...base, status: res.ok ? "SENT" : "FAILED", providerRef: JSON.stringify(j).slice(0, 220), error: res.ok ? null : `HTTP ${res.status}` },
    }).catch(() => {});
  } catch (e) {
    await prisma.smsLog.create({ data: { ...base, status: "FAILED", error: String(e).slice(0, 200) } }).catch(() => {});
  }
}


// Fire-and-forget online registration confirmation (deferred via after()).
export async function sendYouthRegisterSms(serial: string, phone: string): Promise<void> {
  const link = await getSmsLink();
  const to = normalizeGhPhone(phone);
  const base = { kind: "YOUTH_REGISTER", caseNumber: serial, phone: to || String(phone ?? "").slice(0, 20) };
  if (!to) {
    await prisma.smsLog.create({ data: { ...base, status: "SKIPPED", error: "invalid phone" } }).catch(() => {});
    return;
  }
  if (!smsConfigured()) {
    await prisma.smsLog.create({ data: { ...base, status: "SKIPPED", error: "not configured" } }).catch(() => {});
    return;
  }
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "api-key": String(process.env.ARKESEL_API_KEY), "Content-Type": "application/json", "User-Agent": UA },
      body: JSON.stringify({ sender: process.env.ARKESEL_SENDER || "YOUTHDSK", message: youthRegisterSmsText(serial) + ` Youth Desk website: ${link}`, recipients: [to] }),
      signal: AbortSignal.timeout(20000),
    });
    const j = await res.json().catch(() => ({}));
    await prisma.smsLog.create({
      data: { ...base, status: res.ok ? "SENT" : "FAILED", providerRef: JSON.stringify(j).slice(0, 220), error: res.ok ? null : `HTTP ${res.status}` },
    }).catch(() => {});
  } catch (e) {
    await prisma.smsLog.create({ data: { ...base, status: "FAILED", error: String(e).slice(0, 200) } }).catch(() => {});
  }
}
