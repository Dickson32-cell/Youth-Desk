// Seed the first officer account. Usage:
//   node scripts/seed_officer.cjs <username> <password> "<Full Name>"
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const p = new PrismaClient();
(async () => {
  const [u, pass, name] = process.argv.slice(2);
  if (!u || !pass) { console.log("usage: node scripts/seed_officer.cjs <username> <password> <fullname>"); process.exit(1); }
  const username = u.trim().toLowerCase();
  const existing = await p.officer.findUnique({ where: { username } });
  const data = { username, password: bcrypt.hashSync(pass, 10), fullName: name || username };
  if (existing) { await p.officer.update({ where: { username }, data }); console.log("updated officer:", username); }
  else { await p.officer.create({ data }); console.log("created officer:", username); }
  await p.$disconnect();
})().catch((e) => { console.error(e); process.exit(1); });
