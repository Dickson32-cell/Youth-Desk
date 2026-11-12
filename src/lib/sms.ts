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

// The ONLY SMS the system sends of this kind (fixed template, edit here).
export function caseSmsText(caseNumber: string): string {
  const t = `Youth Desk: Your report has been received. Case No. ${caseNumber}. Keep it. To track it, open the Youth Desk website, choose Track and enter this number.`;
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
        message: statusSmsText(caseNumber, status),
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

export async function sendCaseSms(caseNumber: string, phone: string): Promise<void> {
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
        message: caseSmsText(caseNumber),
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
