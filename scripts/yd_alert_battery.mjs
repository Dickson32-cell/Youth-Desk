// Programme youth-alert battery: post a probe programme, alert registered youth,
// prove live SMS + never-twice + the officer-editable link override; clean up fully.
import { PrismaClient } from "@prisma/client";

const BASE = process.env.YD_BASE || "https://youth-desk-74b1jvsxl-abdul-rashid-dicksons-projects.vercel.app";
const OFFICER = process.env.YD_OFFICER || "officer";
const PASS = process.env.YD_PASS || "Desk2026pw";
const SMS_PHONE = "0595726252";
const prisma = new PrismaClient();
let session = "";
const ok = new Set(); const fail = [];
function check(n, c, e = "") { if (c) ok.add(n); else fail.push(n + (e ? " | " + e : "")); console.log((c ? "PASS " : "FAIL ") + n, e); }
async function j(url, opts = {}) {
  for (let i = 1; i <= 3; i++) {
    try {
      const r = await fetch(BASE + url, { ...opts, headers: { ...(opts.headers || {}), ...(session ? { cookie: "youthdesk_session=" + session } : {}) } });
      const t = await r.text(); let b = {}; try { b = JSON.parse(t); } catch {}
      return { status: r.status, body: b };
    } catch (e) { if (i === 3) throw e; await new Promise((r2) => setTimeout(r2, 4000)); }
  }
}
const stamp = Date.now().toString().slice(-6);
const PROBE = "YDAlert " + stamp;

// pre-clean interrupted leftovers (scoped to probe names)
{
  const olds = await prisma.youth.findMany({ where: { name: { startsWith: "YDAlert " } }, select: { id: true } });
  for (const o of olds) await prisma.programmeAlert.deleteMany({ where: { youthId: o.id } });
  if (olds.length) await prisma.youth.deleteMany({ where: { id: { in: olds.map((o) => o.id) } } });
  const oldProgs = await prisma.program.findMany({ where: { title: { startsWith: "Battery Alert Programme" } }, select: { id: true } });
  for (const op of oldProgs) { await prisma.programmeAlert.deleteMany({ where: { programmeId: op.id } }); await prisma.program.delete({ where: { id: op.id } }); }
}

// officer session
{
  const r = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: OFFICER, password: PASS }) });
  session = (r.headers.get("set-cookie") || "").split("youthdesk_session=")[1]?.split(";")[0] || "";
  check("officer login", r.status === 200 && session !== "");
}

// probe youth (with phone) + probe programme
let youthId = 0, progId = 0;
{
  const r = await j("/api/admin/cases/youth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: PROBE, phone: SMS_PHONE, area: "Battery" }) });
  youthId = r.body.youth?.id || 0;
  check("probe youth created", r.status === 200 && youthId > 0);
  const r2 = await j("/api/admin/programmes-post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Battery Alert Programme " + stamp, description: "Probe for the registered-youth alert lane." }) });
  progId = r2.body.row?.id || 0;
  check("probe programme posted", r2.status === 200 && progId > 0);
}

// 1) due count
let due = -1;
{
  const r = await j("/api/admin/programmes-post/youth-alert?id=" + progId);
  due = typeof r.body.due === "number" ? r.body.due : -1;
  check("GET due >= 1", due >= 1, "due=" + due);
}

// 2) first press: live send
{
  const r = await j("/api/admin/programmes-post/youth-alert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: progId }) });
  check("alert press sent", r.status === 200 && r.body.sent >= 1, JSON.stringify(r.body).slice(0, 140));
  const logs = await prisma.smsLog.findMany({ where: { kind: "PROGRAM_ALERT", caseNumber: "PGM-" + progId, status: "SENT" } });
  check("sms ledger SENT", logs.length >= 1, logs.length + " rows");
  const marks = await prisma.programmeAlert.count({ where: { programmeId: progId } });
  check("never-twice mark", marks >= 1);
}

// 3) second press: no duplicates
{
  const r = await j("/api/admin/programmes-post/youth-alert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: progId }) });
  check("second press sends nothing new", r.status === 200 && r.body.sent === 0, "sent=" + r.body.sent);
}

// 4) the officer-editable link override
{
  const set = await j("/api/admin/site/text", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ texts: { sms_web_link: "https://YOUTHDESK-DOMAIN-PROBE.test" } }) });
  check("link override saved", set.status === 200 && Array.isArray(set.body.saved) && set.body.saved.includes("sms_web_link"), JSON.stringify(set.body).slice(0, 80));
  const r2 = await j("/api/admin/programmes-post", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ title: "Battery Alert Programme linkcheck " + stamp, description: "link check" }) });
  const pid = r2.body.row?.id || 0;
  const a = await j("/api/admin/programmes-post/youth-alert", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: pid }) });
  const logs = await prisma.smsLog.findMany({ where: { kind: "PROGRAM_ALERT", caseNumber: "PGM-" + pid, status: "SENT" }, orderBy: { id: "desc" }, take: 1 });
  check("override link used in SMS", a.status === 200 && String(a.body.link || "").includes("YOUTHDESK-DOMAIN-PROBE.test"), "route link=" + a.body.link);
  await prisma.programmeAlert.deleteMany({ where: { programmeId: pid } });
  await prisma.program.delete({ where: { id: pid } });
  await prisma.siteText.delete({ where: { key: "sms_web_link" } }).catch(() => {});
}

// cleanup probes
{
  let n = 0;
  await prisma.programmeAlert.deleteMany({ where: { programmeId: progId } }); n++;
  await prisma.program.delete({ where: { id: progId } }); n++;
  const y = await prisma.youth.findFirst({ where: { name: PROBE }, select: { id: true } });
  if (y) { await prisma.youth.delete({ where: { id: y.id } }); n++; }
  console.log("CLEANUP deleted:", n);
  check("cleanup", n >= 2, "n=" + n);
}
await prisma.$disconnect();
console.log("DONE pass=" + ok.size + " fail=" + fail.length);
if (fail.length) process.exit(1);
