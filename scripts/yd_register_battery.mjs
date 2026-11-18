// Youth Desk battery: public youth self-registration + anonymous phone + Excel Source
// Creates and cleans its own probes in one run. Run FROM the repo cwd.
import { PrismaClient } from "@prisma/client";
import ExcelJS from "exceljs";

const BASE = process.env.YD_BASE || "https://youth-desk-kxsh95jz0-abdul-rashid-dicksons-projects.vercel.app";
const OFFICER = process.env.YD_OFFICER || "officer";
const PASS = process.env.YD_PASS || "Desk2026pw";
const SMS_PHONE = "0595726252"; // Dickson's line (paid lane, ~2 credits) - live proof
let session = "";
const prisma = new PrismaClient();
const ok = new Set();
const fail = [];
function check(name, cond, extra = "") { if (cond) ok.add(name); else fail.push(name + (extra ? " | " + extra : "")); console.log((cond ? "PASS " : "FAIL ") + name, extra); }
async function fetchRetry(url, opts = {}, tries = 3) {
  for (let i = 1; i <= tries; i++) {
    try { return await fetch(url, opts); }
    catch (e) { if (i === tries) throw e; await new Promise((r) => setTimeout(r, 4000)); }
  }
}
async function j(url, opts = {}) {
  const r = await fetchRetry(BASE + url, { ...opts, headers: { ...(opts.headers || {}), ...(session ? { cookie: "youthdesk_session=" + session } : {}) } });
  const t = await r.text();
  let b = {}; try { b = JSON.parse(t); } catch {}
  return { status: r.status, body: b, text: t };
}

// pre-clean: remove battery-probe leftovers from interrupted earlier runs
{
  const olds = await prisma.youth.findMany({ where: { name: { startsWith: "YDProbe " } }, select: { id: true, serial: true } });
  for (const o of olds) await prisma.youth.delete({ where: { id: o.id } });
  if (olds.length) console.log("pre-cleaned leftover probes:", olds.length);
}
// officer session
{
  const r = await fetch(BASE + "/api/auth/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: OFFICER, password: PASS }) });
  const set = r.headers.get("set-cookie") || "";
  session = set.split("youthdesk_session=")[1]?.split(";")[0] || "";
  check("officer login", r.status === 200 && session !== "", "cookie " + (session ? session.slice(0, 6) : "none"));
}

// 1) anon GET /register = public 200
{ const r = await fetchRetry(BASE + "/register"); check("register page public", r.status === 200 && await r.text().then(t => t.includes("Register with the Youth Desk"))); }

// 2) public POST - full probe (valid phone -> live SMS)
const stamp = Date.now().toString().slice(-6);
const PROBE = "YDProbe " + stamp;
let regRes;
{
  regRes = await j("/api/public/youth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: PROBE, phone: SMS_PHONE, area: "Battery Area" }) });
  check("public register 200", regRes.status === 200 && typeof regRes.body.serial === "string", JSON.stringify(regRes.body).slice(0, 120));
}
const yserial = regRes.body.serial || "";

// 3) missing name 400
{ const r = await j("/api/public/youth/register", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: "", phone: "" }) });
  check("register name required", r.status === 400); }

// 4) row lands with source ONLINE + officer can see it
let row = null;
{
  const r = await j("/api/admin/cases/youth?q=" + encodeURIComponent(yserial));
  row = (r.body.youth || []).find((x) => x.serial === yserial) || null;
  check("officer sees online row", !!row && row.source === "ONLINE", row ? row.serial : "missing");
}

// 5) SMS ledger for the probe
{
  await new Promise((res) => setTimeout(res, 9000)); // after() deferred SMS
  const logs = await prisma.smsLog.findMany({ where: { kind: "YOUTH_REGISTER", caseNumber: yserial } });
  check("sms ledger live/sent", logs.some((l) => l.status === "SENT"), logs.map((l) => l.status).join(","));
}

// 6) excel export carries Source + Online cell
{
  const raw = await fetchRetry(BASE + "/api/admin/youth-export", { headers: { cookie: "youthdesk_session=" + session } });
  check("excel 200 xlsx", raw.status === 200, String(raw.status));
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.load(await raw.arrayBuffer());
  const ws = wb.getWorksheet("Youth register");
  const headers = ws.getRow(1).values;
  check("excel Source column", JSON.stringify(headers).includes("Source"), JSON.stringify(headers));
  let found = false;
  for (let n = 2; n <= ws.rowCount; n++) {
    const cells = ws.getRow(n).values || [];
    if (String(cells[2] || "").indexOf(stamp) !== -1) found = String(cells[10] || "") === "Online";
  }
  check("excel probe row marked Online", found, "serial " + yserial + " rows " + ws.rowCount);
}

// 7) anonymous report with a callback phone -> stored with phone, no name
let probeNum = "";
{
  const fd = new FormData();
  fd.append("name", "");
  fd.append("phone", SMS_PHONE);
  fd.append("area", "Battery");
  fd.append("type", "OTHER");
  fd.append("description", "Auto battery probe for the anonymous callback number - created and deleted by the checker.");
  const r = await fetchRetry(BASE + "/api/public/report", { method: "POST", body: fd });
  const b = await r.json().catch(() => ({}));
  probeNum = b.caseNumber || "";
  check("anon report with phone ok", r.status === 200 && !!probeNum, JSON.stringify(b).slice(0, 100));
  if (b.smsQueued) await new Promise((res) => setTimeout(res, 9000));
  const c = await prisma.case.findUnique({ where: { caseNumber: probeNum } });
  check("anon phone stored", !!c && c.phone !== null && c.reporterName === null, c ? String(c.phone).replace(/\d(?=\d{2})/g, "*") : "none");
}

// 8) officer walk-in create still defaults WALKIN (neighbour flow)
let walkinId = null;
{
  const r = await j("/api/admin/cases/youth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: PROBE + " walkin", phone: "", area: "" }) });
  walkinId = r.body.youth?.id || null;
  check("walk-in create ok + WALKIN", r.status === 200 && r.body.youth?.source === "WALKIN", r.body.youth?.source || "?");
}

// CLEANUP (scoped deletes)
{
  let n = 0;
  if (row) { await prisma.youth.delete({ where: { id: row.id } }); n++; }
  if (walkinId) { await prisma.youth.delete({ where: { id: walkinId } }); n++; }
  if (probeNum) { await prisma.case.delete({ where: { caseNumber: probeNum } }); n++; }
  const left = await prisma.youth.count({ where: { name: { contains: "YDProbe " + stamp } } });
  check("cleanup", n === 3 && left === 0, "deleted " + n + ", leftover " + left);
}
await prisma.$disconnect();
console.log("DONE pass=" + ok.size + " fail=" + fail.length);
if (fail.length) process.exit(1);
