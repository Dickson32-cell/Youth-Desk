// Password self-service proof on a THROWAWAY officer (deleted at the end):
// login -> wrong current 400 -> change -> old-pw login 401 -> new-pw login 200.
const BASE = 'http://localhost:3000';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
(async () => {
  for (let i = 0; i < 45; i++) { try { const r = await fetch(BASE + '/', { signal: AbortSignal.timeout(8000) }); if (r.ok) break; } catch {}
    await sleep(2000); }
  console.log('server up');
  const login = async (u, pw) => {
    const r = await fetch(BASE + '/api/auth/login', { method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: u, password: pw }), signal: AbortSignal.timeout(30000) });
    return r;
  };
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient();
  const bcrypt = require('bcryptjs');
  const hash = bcrypt.hashSync('ProbeStart1', 10);
  await p.officer.upsert({ where: { username: 'pwprobe' }, create: { username: 'pwprobe', password: hash, fullName: 'PW Probe' }, update: { password: hash } });
  console.log('probe officer created (pass ProbeStart1)');
  const c1 = await login('pwprobe', 'ProbeStart1');
  const cookie = ((c1.headers.getSetCookie?.() || []).join(';').match(/youthdesk_session=[^;]+/) || [])[0] || '';
  console.log('login with initial pw:', c1.status, cookie ? 'cookie ok' : 'NO COOKIE');
  // wrong current password control:
  const wrong = await fetch(BASE + '/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ currentPassword: 'WrongCurrent', newPassword: 'ProbeNew999', confirmPassword: 'ProbeNew999' }) });
  console.log('wrong current control:', wrong.status, (await wrong.json()).error);
  // short password control:
  const short = await fetch(BASE + '/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ currentPassword: 'ProbeStart1', newPassword: 'short', confirmPassword: 'short' }) });
  console.log('too-short control:', short.status, (await short.json()).error);
  // the real change:
  const ch = await fetch(BASE + '/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json', Cookie: cookie },
    body: JSON.stringify({ currentPassword: 'ProbeStart1', newPassword: 'ProbeNew999', confirmPassword: 'ProbeNew999' }) });
  console.log('password change:', ch.status, JSON.stringify(await ch.json()));
  const oldLogin = await login('pwprobe', 'ProbeStart1');
  console.log('OLD password login:', oldLogin.status, oldLogin.status === 401 ? '(rejected 401 OK)' : 'BUG');
  const newLogin = await login('pwprobe', 'ProbeNew999');
  console.log('NEW password login:', newLogin.status, newLogin.status === 200 ? '(accepted 200 OK)' : 'BUG');
  // cleanup: delete probe officer (no residue) + anon guard check
  const anonPw = await fetch(BASE + '/api/auth/password', { method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ currentPassword: 'x', newPassword: 'yyyyyyyy' }) });
  console.log('anon control:', anonPw.status, anonPw.status === 401 ? 'OK' : 'UNEXPECTED');
  await p.officer.deleteMany({ where: { username: 'pwprobe' } });
  const left = await p.officer.count({ where: { username: 'pwprobe' } }).catch(() => -1);
  await p.$disconnect();
  console.log('cleanup: probe officer deleted, leftovers:', left);
  console.log('PASSWORD FLOW DONE');
})().catch((e) => { console.error('FAILED:', String(e.message).split('\n')[0]); process.exit(1); });
