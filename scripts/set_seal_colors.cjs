
const fs = require("fs");
const urlRaw = fs.readFileSync(".env", "utf8");
const m = urlRaw.match(/DATABASE_URL\s*=\s*"?([^"\r\n]+)"?/);
if (!m) { console.error("no DATABASE_URL"); process.exit(1); }
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ datasources: { db: { url: m[1] } } });
(async () => {
  const row = await prisma.siteTheme.upsert({
    where: { id: 1 },
    update: { primary: "#006A39", accent: "#EFC30C" },
    create: { id: 1, primary: "#006A39", accent: "#EFC30C" },
  });
  console.log("siteTheme now:", JSON.stringify(row));
  await prisma.$disconnect();
})();
