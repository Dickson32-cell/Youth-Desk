const fs = require('fs');
(async () => {
  const envText = fs.readFileSync('.env', 'utf8');
  const dirUrl = envText.match(/^DIRECT_URL="([^"]*)"/m)[1];
  const { PrismaClient } = require('@prisma/client');
  const p = new PrismaClient({ datasourceUrl: dirUrl });
  const t0 = Date.now();
  const t = await p.$queryRawUnsafe(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_type='BASE TABLE'`);
  console.log('direct connect OK in', Date.now() - t0, 'ms | tables:', t[0].n);
  await p.$disconnect();
})().catch((e) => { console.error('WAKE TEST FAILED:', e.message); process.exit(1); });
