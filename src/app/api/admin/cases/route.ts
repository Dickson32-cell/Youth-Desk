import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const status = req.nextUrl.searchParams.get("status");
  const q = req.nextUrl.searchParams.get("q")?.trim() || "";
  const cases = await prisma.case.findMany({
    where: {
      ...(status ? { status } : {}),
      ...(q ? { OR: [
        { caseNumber: { contains: q } },
        { description: { contains: q } },
        { reporterName: { contains: q } },
        { area: { contains: q } },
      ] } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 200,
  });
  const counts = {
    all: await prisma.case.count(),
    NEW: await prisma.case.count({ where: { status: "NEW" } }),
    IN_PROGRESS: await prisma.case.count({ where: { status: "IN_PROGRESS" } }),
    RESOLVED: await prisma.case.count({ where: { status: "RESOLVED" } }),
    FORWARDED: await prisma.case.count({ where: { status: "FORWARDED" } }),
  };
  return NextResponse.json({ cases, counts });
}
