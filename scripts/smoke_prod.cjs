// PRODUCTION e2e: public report -> track -> officer login (200 + 401 control) -> admin auth
// -> admin case list -> middleware guard (anon dashboard) -> cleanup of the probe case.
const BASE = "https://youth-desk-abdul-rashid-dicksons-projects.vercel.app";
const DESC = "TESTPROBE prod e2e - safe to delete";

(async () => {
  const home = await fetch(BASE + "/", { signal: AbortSignal.timeout(60000) });
  const html = await home.text();
  console.log("landing", home.status, "| topbar:", html.includes("logo-t"), "| tabbar:", html.includes('aria-label="Primary"'));

  const rep = await fetch(BASE + "/api/public/report", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ type: "EMPLOYMENT", area: "Prod Test", description: DESC }),
    signal: AbortSignal.timeout(60000),
  });
  const repj = await rep.json();
  const caseNumber = repj.caseNumber || "";
  console.log("report POST", rep.status, "caseNumber:", caseNumber, /^YD-\d{4}-\d+$/.test(caseNumber) ? "FORMAT OK" : "FORMAT BAD");

  const trk = await fetch(BASE + "/api/public/track?caseNumber=" + encodeURIComponent(caseNumber), { signal: AbortSignal.timeout(60000) });
  console.log("track GET", trk.status, "status:", (await trk.json()).status);

  const anonDash = await fetch(BASE + "/dashboard", { redirect: "manual", signal: AbortSignal.timeout(60000) });
  console.log("anon /dashboard", anonDash.status, anonDash.status === 307 || anonDash.status === 302 ? "guarded OK" : "UNEXPECTED");

  const lr = await fetch(BASE + "/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "officer", password: "Desk2026pw" }),
    signal: AbortSignal.timeout(60000),
  });
  const session = ((lr.headers.getSetCookie?.() || []).join(";").match(/youthdesk_session=[^;]+/) || [])[0] || "";
  console.log("login", lr.status, "cookie:", session ? "present" : "MISSING");

  const bad = await fetch(BASE + "/api/auth/login", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: "officer", password: "WrongPass999" }),
    signal: AbortSignal.timeout(60000),
  });
  console.log("wrong-password control", bad.status, bad.status === 401 ? "OK (401)" : "UNEXPECTED");

  const auth = await fetch(BASE + "/api/admin/auth", { headers: { Cookie: session }, signal: AbortSignal.timeout(60000) });
  console.log("admin auth GET", auth.status, "user:", (await auth.json()).username);

  const lst = await fetch(BASE + "/api/admin/cases", { headers: { Cookie: session }, signal: AbortSignal.timeout(60000) });
  const list = await lst.json();
  console.log("admin cases GET", lst.status, "total:", (list.cases || []).length, "probe visible:", (list.cases || []).some((c) => c.caseNumber === caseNumber) ? "YES" : "NO");

  const slip = await fetch(BASE + "/slip/" + caseNumber, { headers: { Cookie: session }, signal: AbortSignal.timeout(60000) });
  console.log("case slip GET", slip.status);

  const { PrismaClient } = require("@prisma/client");
  const p = new PrismaClient();
  const gone = await p.case.deleteMany({ where: { description: DESC } });
  await p.$disconnect();
  console.log("cleanup: deleted", gone.count, "probe case(s)");
  console.log("PROD SMOKE DONE");
})().catch((e) => { console.error("PROD SMOKE FAILED:", e.message); process.exit(1); });
