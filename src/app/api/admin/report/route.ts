import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

// Management report endpoint - quarterly grouping:
//   ?year=2026&q=Q1..Q4 -> one calendar quarter (Ghana time = UTC)
//   ?year=2026&q=whole  -> the whole calendar year
//   q=all (or no params) -> every record since the desk opened
// The response carries the exact period so the printed PDF states
// "Q4 2026 · 1 Oct 2026 – 31 Dec 2026" for easy reference.

function rangeOf(year: number, q: string): { createdAt?: { gte: Date; lt: Date } | undefined; label: string } {
  const validYear = Number.isInteger(year) && year >= 2020 && year <= 2100;
  if (!validYear || q === "ALL" || q === "") return { createdAt: undefined, label: "All records" };
  const quarters: Record<string, { m0: number; mEnd: number; text: string }> = {
    Q1: { m0: 0, mEnd: 3, text: "1 Jan – 31 Mar" },
    Q2: { m0: 3, mEnd: 6, text: "1 Apr – 30 Jun" },
    Q3: { m0: 6, mEnd: 9, text: "1 Jul – 30 Sep" },
    Q4: { m0: 9, mEnd: 12, text: "1 Oct – 31 Dec" },
  };
  if (q === "WHOLE")
    return { createdAt: { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) }, label: `Whole year ${year} · 1 Jan ${year} – 31 Dec ${year}` };
  const qq = quarters[q];
  if (!qq) return { createdAt: undefined, label: "All records" };
  return { createdAt: { gte: new Date(Date.UTC(year, qq.m0, 1)), lt: new Date(Date.UTC(year, qq.mEnd, 1)) }, label: `${q} ${year} · ${qq.text} ${year}` };
}

export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = req.nextUrl;
  const year = parseInt(searchParams.get("year") || "", 10);
  const q = (searchParams.get("q") || "all").toUpperCase();
  const { createdAt, label } = rangeOf(year, q);
  const periodWhere = createdAt ? { createdAt } : {};

  const byAreaRaw = await prisma.case.groupBy({
    by: ["area"],
    _count: { _all: true },
    where: { ...periodWhere, status: { in: ["NEW", "IN_PROGRESS", "RESOLVED", "FORWARDED"] } },
  });
  const resolvedByArea = await prisma.case.groupBy({ by: ["area"], _count: { _all: true }, where: { ...periodWhere, status: "RESOLVED" } });
  const resMap = new Map(resolvedByArea.map((r) => [r.area, r._count._all]));
  const byArea = byAreaRaw
    .map((r) => ({ area: r.area, total: r._count._all, resolved: resMap.get(r.area) || 0 }))
    .sort((a, b) => b.total - a.total);

  const byTypeRaw = await prisma.case.groupBy({ by: ["type"], _count: { _all: true }, where: periodWhere });
  const resolvedByType = await prisma.case.groupBy({ by: ["type"], _count: { _all: true }, where: { ...periodWhere, status: "RESOLVED" } });
  const resType = new Map(resolvedByType.map((r) => [r.type, r._count._all]));
  const byType = byTypeRaw
    .map((r) => ({ m: r.type, total: r._count._all, resolved: resType.get(r.type) || 0 }))
    .sort((a, b) => b.total - a.total);

  const totals = {
    all: await prisma.case.count({ where: periodWhere }),
    NEW: await prisma.case.count({ where: { ...periodWhere, status: "NEW" } }),
    IN_PROGRESS: await prisma.case.count({ where: { ...periodWhere, status: "IN_PROGRESS" } }),
    RESOLVED: await prisma.case.count({ where: { ...periodWhere, status: "RESOLVED" } }),
    FORWARDED: await prisma.case.count({ where: { ...periodWhere, status: "FORWARDED" } }),
  };
  const youth = await prisma.youth.count();
  const youthInPeriod = await prisma.youth.count({ where: periodWhere });
  return NextResponse.json({ byArea, byType, totals, youth, youthInPeriod, period: { label, year: Number.isInteger(year) ? year : null, q } });
}
