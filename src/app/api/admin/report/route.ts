import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const byAreaRaw = await prisma.case.groupBy({
    by: ["area"],
    _count: { _all: true },
    where: { status: { in: ["NEW", "IN_PROGRESS", "RESOLVED", "FORWARDED"] } },
  });
  const resolvedByArea = await prisma.case.groupBy({
    by: ["area"],
    _count: { _all: true },
    where: { status: "RESOLVED" },
  });
  const resMap = new Map(resolvedByArea.map((r) => [r.area, r._count._all]));
  const byArea = byAreaRaw
    .map((r) => ({ area: r.area, total: r._count._all, resolved: resMap.get(r.area) || 0 }))
    .sort((a, b) => b.total - a.total);

  const byTypeRaw = await prisma.case.groupBy({ by: ["type"], _count: { _all: true } });
  const resolvedByType = await prisma.case.groupBy({ by: ["type"], _count: { _all: true }, where: { status: "RESOLVED" } });
  const resType = new Map(resolvedByType.map((r) => [r.type, r._count._all]));
  const byType = byTypeRaw
    .map((r) => ({ m: r.type, total: r._count._all, resolved: resType.get(r.type) || 0 }))
    .sort((a, b) => b.total - a.total);

  const totals = {
    all: await prisma.case.count(),
    NEW: await prisma.case.count({ where: { status: "NEW" } }),
    IN_PROGRESS: await prisma.case.count({ where: { status: "IN_PROGRESS" } }),
    RESOLVED: await prisma.case.count({ where: { status: "RESOLVED" } }),
    FORWARDED: await prisma.case.count({ where: { status: "FORWARDED" } }),
  };
  const youth = await prisma.youth.count();
  return NextResponse.json({ byArea, byType, totals, youth });
}
