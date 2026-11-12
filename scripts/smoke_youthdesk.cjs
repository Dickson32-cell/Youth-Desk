// E2E smoke: public report -> track -> officer login (200 + 401 control) -> admin case list,
// then cleanup of the probe case (same-script cleanup law). DB = Neon youth_desk (youth_app).
const BASE = 'http://localhost:3000';
const DESC = 'TESTPROBE smoke run - safe to delete';

(async () => {
  // 1) wait for dev server
  const waitStart = Date.now();
  while (true) {
    try {
      const r = await fetch(BASE + '/', { signal: AbortSignal.timeout(30000) });
      if (r.ok) { console.log('server up after', Math.round((Date.now() - waitStart) / 1000), 's'); break; }
    } catch {}
    if (Date.now() - waitStart > 90000) { console.log('FAIL: server never came up'); process.exit(1); }
    await new Promise((r) => setTimeout(r, 2000));
  }

  // 2) anonymous report
  const rep = await fetch(BASE + '/api/public/report', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'EMPLOYMENT', area: 'Test Area', description: DESC }),
    signal: AbortSignal.timeout(60000),
  });
  const repj = await rep.json();
  const caseNumber = repj.caseNumber || '';
  console.log('report POST', rep.status, 'caseNumber:', caseNumber, /^YD-\d{4}-\d+$/.test(caseNumber) ? 'FORMAT OK' : 'FORMAT BAD');

  // 3) track
  const trk = await fetch(BASE + '/api/public/track?caseNumber=' + encodeURIComponent(caseNumber), { signal: AbortSignal.timeout(60000) });
  const trkJson = await trk.json();
  console.log('track GET', trk.status, 'status:', trkJson.status, trkJson.status === 'NEW' ? 'OK' : 'UNEXPECTED');

  // 4) officer login - good + bad control
  const lr = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'officer', password: 'Desk2026pw' }),
    signal: AbortSignal.timeout(60000),
  });
  const cookie = (lr.headers.getSetCookie?.() || []).join(';');
  const session = (cookie.match(/youthdesk_session=[^;]+/) || [])[0] || '';
  console.log('login', lr.status, 'session cookie:', session ? 'present' : 'MISSING', 'role:', (await lr.json()).role);

  const bad = await fetch(BASE + '/api/auth/login', {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'officer', password: 'WrongPass999' }),
    signal: AbortSignal.timeout(60000),
  });
  console.log('wrong-password control', bad.status, bad.status === 401 ? 'OK (401)' : 'UNEXPECTED');

  // 5) admin case list
  const lst = await fetch(BASE + '/api/admin/cases', {
    headers: { Cookie: session }, signal: AbortSignal.timeout(60000),
  });
  const list = await lst.json();
  const rows = Array.isArray(list) ? list : Array.isArray(list.cases) ? list.cases : [];
  const probe = rows.find((c) => c.caseNumber === caseNumber);
  console.log('admin cases GET', lst.status, 'total rows:', rows.length, 'probe visible:', probe ? 'YES' : 'NO');

  // 6) cleanup - delete probe rows via prisma (no orphan)
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  const gone = await p.case.deleteMany({ where: { description: DESC } });
  await p.$disconnect();
  const left = await p.case.count({ where: { description: DESC } }).catch(() => 'n/a');
  console.log('cleanup: deleted', gone.count, 'probe case(s); leftovers after delete:', gone.count ? 'check via new client' : gone.count);
  console.log('SMOKE DONE');
})().catch((e) => { console.error('SMOKE FAILED:', e.message); process.exit(1); });
