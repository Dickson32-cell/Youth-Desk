import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { verifySession, SESSION_COOKIE } from "@/lib/auth";

// Lightweight new-case heartbeat for the officer console: the dashboard polls
// this every 10 s alongside its queue refresh and raises a notification
// whenever the ALL-TIME case count grows - that is exactly "a new case
// arrived", regardless of the filter/screen the officer currently has open.
export async function GET(req: NextRequest) {
  const s = verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  if (!s) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const [count, latest] = await Promise.all([
    prisma.case.count(),
    prisma.case.findFirst({ orderBy: { id: "desc" }, select: { caseNumber: true, status: true, area: true, type: true, reporterName: true, createdAt: true } }),
  ]);
  return NextResponse.json({ count, latest });
}
