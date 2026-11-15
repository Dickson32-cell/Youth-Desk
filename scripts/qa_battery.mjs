// Youth Desk FULL FLOW BATTERY - run from the repo cwd (node scripts/qa_battery.mjs).
// Env: YD_BASE (prod or localhost:3000), YD_OFFICER, YD_PASS. Optional YD_TEST_PHONE
// (defaults to a neutral test number; every send costs ~1 Arkesel credit).
// Creates its own probes and cleans them up in the same run.
// NOTE: test phones differ per run - the Arkesel network suppresses near-duplicate
// texts to the same number within minutes; rotate numbers when re-running SMS checks.
const BASE = process.env.YD_BASE || 'https://youth-desk-abdul-rashid-dicksons-projects.vercel.app';
const PHONE = process.env.YD_TEST_PHONE || '0595726252';
const results = [];
const ok = (n, v) => results.push((v === true ? 'PASS ' : v === false ? 'FAIL ' : '     ') + n);

(async () => {
  const good = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: process.env.YD_OFFICER || 'officer', password: process.env.YD_PASS || 'Desk2026pw' }) });
  const cookie = ((good.headers.getSetCookie?.() || []).join(';').match(/youthdesk_session=[^;]+/) || [])[0];
  const H = { 'Content-Type': 'application/json', Cookie: cookie };
  const J = async (r) => r.json().catch(() => null);
  ok('officer login', good.status === 200 && !!cookie);
  const bad = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ username: process.env.YD_OFFICER || 'officer', password: 'wrong' }) });
  ok('wrong password rejected (401)', bad.status === 401);

  // CASES
  const cr = await J(await fetch(BASE + '/api/admin/cases', { method: 'POST', headers: H, body: JSON.stringify({ area: 'Adweso', type: 'OTHER', customType: 'QA flow', description: 'QA battery probe case - deleted at the end.', contactName: 'QA Flow', phone: PHONE }) }));
  ok('case create', !!cr && !!cr.caseNumber && !!cr.trackKey);
  const list0 = await J(await fetch(BASE + '/api/admin/cases?q=' + encodeURIComponent(cr.caseNumber), { headers: { Cookie: cookie } }));
  const caseRow = list0 && (list0.rows || list0.cases || []).find(x => x.caseNumber === cr.caseNumber);
  const caseId = caseRow && caseRow.id;
  const st = await J(await fetch(BASE + '/api/admin/notes', { method: 'PATCH', headers: H, body: JSON.stringify({ id: caseId, status: 'IN_PROGRESS', note: 'QA started' }) }));
  ok('case status + note', !!st && st.ok === true);
  const rs = await J(await fetch(BASE + '/api/admin/notes', { method: 'PATCH', headers: H, body: JSON.stringify({ id: caseId, status: 'RESOLVED', note: 'QA resolved' }) }));
  ok('case resolve', !!rs && rs.ok === true);
  for (const p of ['/slip/' + cr.caseNumber, '/forward/' + cr.caseNumber, '/evidence/' + cr.caseNumber]) {
    const page = await fetch(BASE + p);
    ok('printable renders ' + p.split('/')[1], page.status === 200);
  }
  ok('management report data', (await fetch(BASE + '/api/admin/report', { headers: { Cookie: cookie } })).status === 200);
  ok('case delete (cleanup)', (await fetch(BASE + '/api/admin/cases/' + caseId, { method: 'DELETE', headers: { Cookie: cookie } })).ok);

  // YOUTH (walk-in register endpoints live under cases/youth)
  const yr = await J(await fetch(BASE + '/api/admin/cases/youth', { method: 'POST', headers: H, body: JSON.stringify({ name: 'QA Flow Youth', phone: '0550000999', area: 'Adweso', note: 'QA battery' }) }));
  ok('youth walk-in register', !!yr && yr.ok === true);
  const yid = yr && yr.youth && yr.youth.id;
  ok('youth list', Array.isArray((await J(await fetch(BASE + '/api/admin/cases/youth', { headers: { Cookie: cookie } })))?.youth));
  ok('youth delete (cleanup)', (await fetch(BASE + '/api/admin/cases/youth?id=' + yid + '&force=1', { method: 'DELETE', headers: { Cookie: cookie } })).ok);

  // PROGRAMMES (unified with the KPI register)
  const iv = await J(await fetch(BASE + '/api/admin/interventions', { method: 'POST', headers: H, body: JSON.stringify({ date: new Date().toISOString().slice(0, 10), department: 'QA Dept', title: 'QA unified probe', type: 'TRAINING', target: 5, reached: 0, postToWebsite: true, venue: 'QA hall', deadline: '31 Dec 2026', meetingDate: '20 Dec 2026' }) }));
  ok('log intervention + post checkbox', !!iv && iv.ok === true && !!iv.post);
  const pid = iv.post.id, iid = iv.row.id;
  const pub = await J(await fetch(BASE + '/api/public/programmes'));
  ok('posted programme public', (pub.rows || []).some(r => r.id === pid));
  const w1 = await J(await fetch(BASE + '/api/admin/programmes-post/walkin', { method: 'POST', headers: H, body: JSON.stringify({ id: pid, name: 'QA Walk Phone', phone: '0550000888', area: 'QA' }) }));
  ok('walk-in with phone (SMS queued)', !!w1 && w1.ok === true && w1.smsQueued === true);
  const w2 = await J(await fetch(BASE + '/api/admin/programmes-post/walkin', { method: 'POST', headers: H, body: JSON.stringify({ id: pid, name: 'QA Walk NoPhone' }) }));
  ok('walk-in without phone (no SMS)', !!w2 && w2.ok === true && w2.smsQueued === false);
  const dup = await J(await fetch(BASE + '/api/admin/programmes-post/walkin', { method: 'POST', headers: H, body: JSON.stringify({ id: pid, name: 'QA Walk Phone', phone: '0550000888' }) }));
  ok('duplicate walk-in blocked (409)', !!dup && !!dup.error);
  const rem = await J(await fetch(BASE + '/api/admin/programmes-post/reminder', { method: 'POST', headers: H, body: JSON.stringify({ id: pid }) }));
  ok('remind all (single round)', !!rem && rem.ok === true && rem.remaining === 0);
  const rem2 = await J(await fetch(BASE + '/api/admin/programmes-post/reminder', { method: 'POST', headers: H, body: JSON.stringify({ id: pid }) }));
  ok('never-twice: plain re-send sends 0', !!rem2 && rem2.sent === 0);
  const ivg = await J(await fetch(BASE + '/api/admin/interventions', { headers: { Cookie: cookie } }));
  const mine = ivg.rows.find(r => r.id === iid);
  ok('reached = live sign-up count (2)', mine && mine.reachedCalc === 2 && mine.liveReached === 2);
  ok('coverage computed (40% of target 5)', mine && mine.coverage === 40);
  const full = await J(await fetch(BASE + '/api/admin/programmes-post?full=1', { headers: { Cookie: cookie } }));
  const myFull = full.rows.find(r => r.id === pid);
  ok('PDF payload carries walkin/online sources', !!myFull && myFull.registrations.every(r => typeof r.walkin === 'boolean'));
  const dl = await J(await fetch(BASE + '/api/admin/interventions?id=' + iid, { method: 'DELETE', headers: { Cookie: cookie } }));
  const pubAfter = await J(await fetch(BASE + '/api/public/programmes'));
  ok('intervention delete cascades to post', !!dl && dl.ok && !(pubAfter.rows || []).some(r => r.id === pid));

  // EXPORT + BRANDING + SHELL
  const xlsx = await fetch(BASE + '/api/admin/youth-export', { headers: { Cookie: cookie } });
  ok('youth Excel export', xlsx.status === 200 && (xlsx.headers.get('content-type') || '').includes('sheet'));
  ok('content/text API', (await fetch(BASE + '/api/admin/site/text', { headers: { Cookie: cookie } })).status === 200);
  ok('seal endpoint', [200, 204, 302].includes((await fetch(BASE + '/api/seal')).status));
  ok('PWA manifest', ((await fetch(BASE + '/manifest.webmanifest')).status === 200));
  ok('service worker', (await fetch(BASE + '/sw.js')).status === 200);

  // EXPOSURE / GATES
  ok('clean 404 for unknown dynamic route', (await fetch(BASE + '/office/no-such')).status === 404);
  const nf = await (await fetch(BASE + '/no-such-page')).text().catch(() => '');
  ok('fallback route leaks nothing', !nf.includes('/Users/') && !nf.includes('node_modules') && !nf.includes('Prisma'));
  ok('cron guarded (401 without Bearer)', (await fetch(BASE + '/api/cron/programme-reminders')).status === 401);
  ok('forged cookie rejected', (await fetch(BASE + '/api/admin/interventions', { headers: { Cookie: 'youthdesk_session=deadbeef' } })).status === 401);

  console.log(results.join('\n'));
  const fails = results.filter(r => r.startsWith('FAIL')).length;
  console.log(fails ? '\n*** ' + fails + ' FAILURE(S) - fix before reporting done ***' : '\nALL FLOWS PASS');
})();
