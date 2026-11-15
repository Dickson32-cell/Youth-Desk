// Seed the official Assembly department list into SiteItem (the officers console is the editor).
// Guarded: refuses to run when department rows already exist, so it never duplicates or overwrites.
const { PrismaClient } = require("@prisma/client");
const p = new PrismaClient();

const DEPTS = [
  "Central Administration",
  "Department of Social Welfare and Community Development",
  "Works Department",
  "Physical Planning Department",
  "Statistics Department",
  "Human Resource Department",
  "Department of Urban Roads",
  "Finance Department",
  "Department of Births and Deaths",
  "Agric Department",
  "Education Directorate",
  "Health Directorate",
  "Natural Resources Conservation and Forestry",
  "Trade and Industry",
];

(async () => {
  const existing = await p.siteItem.findMany({ where: { kind: "department" } });
  if (existing.length > 0) {
    console.log("Departments already exist (" + existing.length + ") - refusing to seed. Clear them in the console first.");
    await p.$disconnect();
    process.exit(1);
  }
  for (const title of DEPTS) {
    await p.siteItem.create({ data: { kind: "department", title, body: "" } });
  }
  const rows = await p.siteItem.findMany({ where: { kind: "department" }, orderBy: { id: "asc" } });
  console.log("SEEDED", rows.length, "departments");
  rows.forEach((r) => console.log(" ", r.id, r.title));
  await p.$disconnect();
})().catch((e) => { console.error(String(e).slice(0, 400)); process.exit(1); });
