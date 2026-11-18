// Live proof: every SMS lane now carries the web link.
// Probes: 1 confirmation lane (public report with phone) -> tracker shows the link.
// Per-phone SMS flood windows are respected (single report, waits after send).
import { PrismaClient } from "@prisma/client";

const BASE = process.env.YD_BASE || "https://youth-desk-f8dfy0j2m-abdul-rashid-dicksons-projects.vercel.app";
const OFFICER = process.env.YD_OFFICER || "officer";
const PASS = process.env.YD_PASS || "Desk2026pw";
const PHONE = "0595726252"; // Dickson's line: live-delivery proof lane
let session = "";
import { readFileSync } from "node:fs";
function envVal(k) {
  const t = readFileSync(new URL("../.env", import.meta.url), "utf8");
  const line = t.split("\n").find((l) => l.startsWith(k + "="));
  if (!line) return "";
  let v = line.slice(k.length + 1).trim();
  if ((v.startsWith('"') && v.endsWith('"')) || (v.startsWith("'") && v.endsWith("'"))) v = v.slice(1, -1);
  return v;
}
const ARK_KEY = envVal("ARKESEL_API_KEY");
const prisma = new PrismaClient();
const ok = new Set(); const fail = [];
function check(n, c, e = "") { if (c) ok.add(n); else fail.push(n + (e ? " | " + e : "")); console.log((c ? "PASS " : "FAIL ") + n, e); }
const UA = { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 YouthDesk/1.0" };

// officer session for tracker access
{
  const r = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: OFFICER, password: PASS }) });
  session = (r.headers.get("set-cookie") || "").split("youthdesk_session=")[1]?.split(";")[0] || "";
  check("officer login", r.status === 200 && session !== "");
}

const stamp = Date.now().toString().slice(-6);
const PROBE = "YDLink " + stamp;

// pre-clean leftovers of earlier interrupted link probes
{
  const olds = await prisma.youth.findMany({ where: { name: { startsWith: "YDLink " } }, select: { id: true } });
  for (const o of olds) await prisma.youth.delete({ where: { id: o.id } });
}

// 1) CASE_CONFIRM lane: anonymous report with phone -> tracker must show the link
let probeNum = "", probeKey = "";
{
  const fd = new FormData();
  fd.append("name", "");
  fd.append("phone", PHONE);
  fd.append("area", "Battery");
  fd.append("type", "OTHER");
  fd.append("description", "Auto link-probe case " + stamp + " - created and deleted by the checker.");
  const r = await fetch(BASE + "/api/public/report", { method: "POST", body: fd });
  const b = await r.json().catch(() => ({}));
  probeNum = b.caseNumber || ""; probeKey = b.trackKey || "";
  if (b.smsQueued) await new Promise((x) => setTimeout(x, 9000));
  const logs = await prisma.smsLog.findMany({ where: { kind: "CASE_CONFIRM", caseNumber: probeNum, status: "SENT" }, orderBy: { id: "desc" }, take: 1 });
  const ref = jsonSafe(logs[0]?.providerRef || "{}");
  const smsId = Array.isArray(ref.data) && ref.data[0]?.id;
  if (smsId) {
    const tr = await fetch("https://sms.arkesel.com/api/v2/sms/" + smsId, { headers: { ...UA, "api-key": ARK_KEY } });
    const tj = await tr.json().catch(() => ({}));
    const msg = JSON.stringify(tj);
    check("case SMS carries link", msg.includes("youth-desk-abdul") && msg.includes("Track it here"), msg.slice(0, 100));
  } else {
    check("case SMS carries link", false, "no tracker id in ledger");
  }
}

// 2a) STATUS lane: start working -> tracker must show the link
{
  const pc = await prisma.case.findUnique({ where: { caseNumber: probeNum }, select: { id: true, status: true } });
  await fetch(BASE + "/api/admin/notes", { method: "PATCH", headers: { "Content-Type": "application/json", cookie: "youthdesk_session=" + session }, body: JSON.stringify({ id: pc.id, status: "IN_PROGRESS" }) }).catch(() => {});
  await new Promise((x) => setTimeout(x, 9000));
  const logs = await prisma.smsLog.findMany({ where: { kind: "STATUS_IN_PROGRESS", caseNumber: probeNum, status: "SENT" }, orderBy: { id: "desc" }, take: 1 });
  const ref = jsonSafe(logs[0]?.providerRef || "{}");
  const smsId = Array.isArray(ref.data) && ref.data[0]?.id;
  if (smsId) {
    const tr = await fetch("https://sms.arkesel.com/api/v2/sms/" + smsId, { headers: { ...UA, "api-key": ARK_KEY } });
    const tj = await tr.json().catch(() => ({}));
    const msg = JSON.stringify(tj);
    check("status SMS carries link", msg.includes("started working") && msg.includes("Track it here"), msg.slice(0, 100));
  } else {
    // same-status guard or flood: check ledger honestly
    const any = await prisma.smsLog.findMany({ where: { kind: "STATUS_IN_PROGRESS", caseNumber: probeNum } });
    check("status SMS carries link", false, "no SENT row; ledger=" + JSON.stringify(any.map((a) => a.status + ":" + (a.error || ""))));
  }
}
// 2b) resolve -> RESOLVED lane carries the link
{
  const pc2 = await prisma.case.findUnique({ where: { caseNumber: probeNum }, select: { id: true } });
  await fetch(BASE + "/api/admin/notes", { method: "PATCH", headers: { "Content-Type": "application/json", cookie: "youthdesk_session=" + session }, body: JSON.stringify({ id: pc2.id, status: "RESOLVED", note: "Link probe resolution." }) }).catch(() => {});
  await new Promise((x) => setTimeout(x, 9000));
  const logs = await prisma.smsLog.findMany({ where: { kind: "STATUS_RESOLVED", caseNumber: probeNum, status: "SENT" }, orderBy: { id: "desc" }, take: 1 });
  const ref = jsonSafe(logs[0]?.providerRef || "{}");
  const smsId = Array.isArray(ref.data) && ref.data[0]?.id;
  if (smsId) {
    const tr = await fetch("https://sms.arkesel.com/api/v2/sms/" + smsId, { headers: { ...UA, "api-key": ARK_KEY } });
    const tj = await tr.json().catch(() => ({}));
    const msg = JSON.stringify(tj);
    check("resolved SMS carries link", msg.includes("See your outcome") && msg.includes("youth-desk-abdul"), msg.slice(0, 100));
  } else {
    const any = await prisma.smsLog.findMany({ where: { kind: "STATUS_RESOLVED", caseNumber: probeNum } });
    check("resolved SMS carries link", false, "no SENT row; ledger=" + JSON.stringify(any.map((a) => a.status + ":" + (a.error || ""))));
  }
}

// cleanup: the probe case (SmsLog rows stay as the ledger)
{
  const c = await prisma.case.findUnique({ where: { caseNumber: probeNum }, select: { id: true } });
  if (c) await prisma.case.delete({ where: { id: c.id } });
  console.log("CLEANUP case deleted:", !!c);
  check("cleanup", !!c);
}

function jsonSafe(s) { try { return JSON.parse(s); } catch { return {}; } }
await prisma.$disconnect();
console.log("DONE pass=" + ok.size + " fail=" + fail.length);
if (fail.length) process.exit(1);
